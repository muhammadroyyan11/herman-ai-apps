from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.core.security.auth import get_optional_user
from app.core.ai.base import Message as AIMessage
from app.core.ai.providers import get_provider
from app.core.agent.engine import AgentEngine
from app.core.tools.registry import tool_registry
from app.core.tools.builtin import register_builtin_tools
from app.models.base import User

router = APIRouter()
register_builtin_tools()


class AgentRequest(BaseModel):
    prompt: str
    provider: str = "deepseek"
    model: Optional[str] = None
    tools: Optional[List[str]] = None


@router.post("/execute")
async def execute_agent(
    req: AgentRequest,
    user: User = Depends(get_optional_user),
):
    provider = get_provider(req.provider, model=req.model)

    agent = AgentEngine(
        provider=provider,
        tool_registry=tool_registry,
    )

    messages = [AIMessage(role="user", content=req.prompt)]
    response = await agent.execute(
        messages=messages,
        user_context={
            "user_id": user.id if user else None,
            "user_name": user.display_name if user else None,
            "current_query": req.prompt,
        },
        tools=req.tools,
    )

    return {
        "response": response.content,
        "usage": response.usage,
        "model": response.model,
    }
