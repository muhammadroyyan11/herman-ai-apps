from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.core.database import get_db
from app.core.ai.base import Message as AIMessage
from app.core.ai.providers import get_provider
from app.core.agent.engine import AgentEngine
from app.core.tools.registry import tool_registry
from app.core.tools.builtin import register_builtin_tools
from app.config.settings import get_settings
from app.models.base import Conversation, Message

router = APIRouter()
register_builtin_tools()


class BotChatRequest(BaseModel):
    content: str
    chat_id: Optional[str] = None


@router.post("/bot/chat")
async def bot_chat(
    req: BotChatRequest,
    x_api_key: str = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    if x_api_key != settings.TELEGRAM_BOT_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

    provider = get_provider("deepseek")
    agent = AgentEngine(
        provider=provider,
        tool_registry=tool_registry,
    )

    messages = [AIMessage(role="user", content=req.content)]

    user_context = {
        "current_query": req.content,
    }

    response = await agent.execute(
        messages=messages,
        user_context=user_context,
        tools=None,
        stream=False,
    )

    return {
        "content": response.content,
        "usage": response.usage,
    }
