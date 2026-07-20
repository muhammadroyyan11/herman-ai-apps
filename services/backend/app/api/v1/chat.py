from datetime import datetime, timezone
import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from loguru import logger

from app.core.database import get_db
from app.core.security.auth import get_optional_user
from app.core.ai.base import Message as AIMessage
from app.core.ai.providers import get_provider
from app.core.agent.engine import AgentEngine
from app.core.tools.registry import tool_registry
from app.core.tools.builtin import register_builtin_tools
from app.models.base import Conversation, Message, User, Workspace

router = APIRouter()
register_builtin_tools()


class SendMessageRequest(BaseModel):
    conversation_id: Optional[str] = None
    content: str
    provider: str = "deepseek"
    model: Optional[str] = None
    workspace_id: Optional[str] = None
    stream: bool = False


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: str


class ConversationSummary(BaseModel):
    id: str
    title: str
    provider: str
    model: str
    message_count: int
    is_pinned: bool
    created_at: str
    updated_at: str


@router.post("/send")
async def send_message(
    req: SendMessageRequest,
    user: User = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    provider = get_provider(req.provider, model=req.model)

    # Get or create conversation
    if req.conversation_id:
        result = await db.execute(
            select(Conversation).where(Conversation.id == req.conversation_id)
        )
        conv = result.scalar_one_or_none()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conv = Conversation(
            user_id=user.id if user else None,
            ai_provider=req.provider,
            ai_model=req.model or provider.default_model,
            workspace_id=req.workspace_id,
            title=req.content[:100],
        )
        db.add(conv)
        await db.flush()

    # Save user message
    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=req.content,
    )
    db.add(user_msg)

    # Load conversation history
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv.id)
        .order_by(Message.created_at)
        .limit(50)
    )
    history = result.scalars().all()

    messages = [AIMessage(role=m.role, content=m.content) for m in history]

    # Build agent engine
    agent = AgentEngine(
        provider=provider,
        tool_registry=tool_registry,
    )

    user_context = {
        "user_id": user.id if user else None,
        "user_name": user.display_name if user else None,
        "user_email": user.email if user else None,
        "current_query": req.content,
    }

    # Load workspace settings if workspace is specified
    enabled_tools = None
    if req.workspace_id and user:
        ws_result = await db.execute(
            select(Workspace).where(Workspace.id == req.workspace_id, Workspace.user_id == user.id)
        )
        ws = ws_result.scalar_one_or_none()
        if ws:
            if ws.settings and ws.settings.get("agent_instruction"):
                user_context["workspace_instruction"] = ws.settings["agent_instruction"]
                user_context["workspace_name"] = ws.name
                user_context["workspace_type"] = ws.workspace_type
            if ws.tools_enabled:
                enabled_tools = ws.tools_enabled

    response = await agent.execute(
        messages=messages,
        user_context=user_context,
        tools=enabled_tools,
        stream=False,
    )

    # Save assistant message
    assistant_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role="assistant",
        content=response.content,
        token_count=response.usage.get("total_tokens", 0) if response.usage else 0,
    )
    db.add(assistant_msg)

    # Update conversation
    conv.message_count = len(history) + 2
    if response.usage:
        conv.token_count += response.usage.get("total_tokens", 0)
    conv.ai_model = response.model or conv.ai_model

    return {
        "conversation_id": conv.id,
        "message": {
            "id": assistant_msg.id,
            "role": "assistant",
            "content": response.content,
            "created_at": (assistant_msg.created_at or datetime.now(timezone.utc)).isoformat(),
        },
        "usage": response.usage,
    }


@router.post("/send/stream")
async def send_message_stream(
    req: SendMessageRequest,
    user: User = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    provider = get_provider(req.provider, model=req.model)

    if req.conversation_id:
        result = await db.execute(
            select(Conversation).where(Conversation.id == req.conversation_id)
        )
        conv = result.scalar_one_or_none()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conv = Conversation(
            user_id=user.id if user else None,
            ai_provider=req.provider,
            ai_model=req.model or provider.default_model,
            workspace_id=req.workspace_id,
            title=req.content[:100],
        )
        db.add(conv)
        await db.flush()

    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=req.content,
    )
    db.add(user_msg)

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv.id)
        .order_by(Message.created_at)
        .limit(50)
    )
    history = result.scalars().all()
    messages = [AIMessage(role=m.role, content=m.content) for m in history]

    agent = AgentEngine(
        provider=provider,
        tool_registry=tool_registry,
    )

    user_context = {
        "user_id": user.id if user else None,
        "user_name": user.display_name if user else None,
        "user_email": user.email if user else None,
        "current_query": req.content,
    }

    enabled_tools = None
    if req.workspace_id and user:
        ws_result = await db.execute(
            select(Workspace).where(Workspace.id == req.workspace_id, Workspace.user_id == user.id)
        )
        ws = ws_result.scalar_one_or_none()
        if ws:
            if ws.settings and ws.settings.get("agent_instruction"):
                user_context["workspace_instruction"] = ws.settings["agent_instruction"]
                user_context["workspace_name"] = ws.name
                user_context["workspace_type"] = ws.workspace_type
            if ws.tools_enabled:
                enabled_tools = ws.tools_enabled

    async def generate():
        full_content = ""
        try:
            async for chunk in agent.execute_stream(
                messages=messages,
                user_context=user_context,
                tools=enabled_tools,
            ):
                if chunk.content:
                    full_content += chunk.content
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk.content})}\n\n"
                if chunk.tool_calls:
                    for tc in chunk.tool_calls:
                        name = tc.get("function", {}).get("name", "")
                        yield f"data: {json.dumps({'type': 'tool', 'tool': name})}\n\n"
                if chunk.finish_reason:
                    yield f"data: {json.dumps({'type': 'done', 'usage': chunk.usage})}\n\n"
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)[:200]})}\n\n"
            full_content = f"Error: {str(e)[:200]}"

        # Save to DB after stream ends
        assistant_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role="assistant",
            content=full_content,
        )
        db.add(assistant_msg)
        conv.message_count = len(history) + 2
        await db.commit()

        yield f"data: {json.dumps({'type': 'full', 'content': full_content, 'conversation_id': conv.id})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/conversations")
async def list_conversations(
    user: User = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    workspace_id: Optional[str] = Query(None),
):
    if not user:
        return {"conversations": []}

    stmt = (
        select(Conversation)
        .where(Conversation.user_id == user.id, Conversation.is_deleted == False)
    )
    if workspace_id:
        stmt = stmt.where(Conversation.workspace_id == workspace_id)

    stmt = stmt.order_by(desc(Conversation.is_pinned), desc(Conversation.updated_at)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    conversations = result.scalars().all()

    return {
        "conversations": [
            {
                "id": c.id,
                "title": c.title,
                "provider": c.ai_provider,
                "model": c.ai_model,
                "message_count": c.message_count,
                "is_pinned": c.is_pinned,
                "workspace_id": c.workspace_id,
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat(),
            }
            for c in conversations
        ]
    }


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()

    return {
        "id": conv.id,
        "title": conv.title,
        "provider": conv.ai_provider,
        "model": conv.ai_model,
        "workspace_id": conv.workspace_id,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
    }


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user: User = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if user and conv.user_id and conv.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    conv.is_deleted = True
    return {"message": "Conversation deleted"}
