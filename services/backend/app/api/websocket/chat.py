import json
from fastapi import WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.core.database import get_db
from app.core.security.auth import decode_token
from app.core.ai.base import Message as AIMessage
from app.core.ai.providers import get_provider
from app.core.agent.engine import AgentEngine
from app.core.tools.registry import tool_registry
from app.core.tools.builtin import register_builtin_tools
from app.models.base import Conversation, Message, User, Workspace

register_builtin_tools()


class ChatWebSocketManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, client_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)

    async def send_message(self, client_id: str, message: dict):
        ws = self.active_connections.get(client_id)
        if ws:
            await ws.send_json(message)

    async def send_chunk(self, client_id: str, content: str):
        ws = self.active_connections.get(client_id)
        if ws:
            await ws.send_json({"type": "chunk", "content": content})

    async def send_done(self, client_id: str, usage: dict = None):
        ws = self.active_connections.get(client_id)
        if ws:
            await ws.send_json({"type": "done", "usage": usage})

    async def send_error(self, client_id: str, error: str):
        ws = self.active_connections.get(client_id)
        if ws:
            await ws.send_json({"type": "error", "error": error})


manager = ChatWebSocketManager()


async def handle_chat_websocket(websocket: WebSocket, db: AsyncSession):
    client_id = f"ws_{id(websocket)}"
    await manager.connect(client_id, websocket)

    try:
        data = await websocket.receive_json()
        action = data.get("action")

        if action == "chat":
            await handle_chat_message(client_id, data, db)
        elif action == "stop":
            manager.disconnect(client_id)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {client_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await manager.send_error(client_id, str(e))
    finally:
        manager.disconnect(client_id)


async def handle_chat_message(client_id: str, data: dict, db: AsyncSession):
    content = data.get("content", "")
    conversation_id = data.get("conversation_id")
    provider_name = data.get("provider", "deepseek")
    model = data.get("model")

    # Auth
    user_id = None
    token = data.get("token")
    if token:
        try:
            payload = decode_token(token)
            user_id = payload.get("sub")
        except Exception:
            pass

    provider = get_provider(provider_name, model=model)

    # Get or create conversation
    if conversation_id:
        result = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conv = result.scalar_one_or_none()
        if not conv:
            await manager.send_error(client_id, "Conversation not found")
            return
    else:
        conv = Conversation(
            user_id=user_id,
            ai_provider=provider_name,
            ai_model=model or provider.default_model,
            title=content[:100],
        )
        db.add(conv)
        await db.flush()
        await manager.send_message(client_id, {"type": "conversation_id", "id": conv.id})

    # Save user message
    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=content,
    )
    db.add(user_msg)

    # Load history
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

    full_response = ""
    async for chunk in agent.execute(
        messages=messages,
        user_context={"user_id": user_id, "current_query": content},
        stream=True,
    ):
        if chunk.content:
            full_response += chunk.content
            await manager.send_chunk(client_id, chunk.content)
        if chunk.finish_reason:
            usage = chunk.usage
            await manager.send_done(client_id, usage)

            # Save assistant message
            assistant_msg = Message(
                conversation_id=conv.id,
                role="assistant",
                content=full_response,
                token_count=usage.get("total_tokens", 0) if usage else 0,
            )
            db.add(assistant_msg)
            conv.message_count = len(history) + 2
