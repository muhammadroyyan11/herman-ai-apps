from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security.auth import get_optional_user
from app.core.tools.registry import tool_registry
from app.models.base import User, ToolLog

router = APIRouter()


class ExecuteToolRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]


@router.get("")
async def list_tools():
    tools = tool_registry.get_enabled_tools()
    return {
        "tools": [
            {
                "name": name,
                "description": tool.description,
                "input_schema": tool.input_schema,
                "requires_auth": tool.requires_auth,
                "timeout": tool.timeout,
            }
            for name, tool in tools.items()
        ]
    }


@router.post("/execute")
async def execute_tool(
    req: ExecuteToolRequest,
    user: User = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    tool = tool_registry.get(req.tool_name)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{req.tool_name}' not found")
    if not tool.is_enabled:
        raise HTTPException(status_code=403, detail="Tool is disabled")
    if tool.requires_auth and not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        result = await tool_registry.execute(
            tool_name=req.tool_name,
            arguments=req.arguments,
            user_id=user.id if user else None,
        )

        log = ToolLog(
            user_id=user.id if user else None,
            tool_name=req.tool_name,
            input_data=req.arguments,
            output_data={"result": str(result)[:1000]},
            status="success",
        )
        db.add(log)

        return {"result": result}
    except Exception as e:
        log = ToolLog(
            user_id=user.id if user else None,
            tool_name=req.tool_name,
            input_data=req.arguments,
            status="error",
            error_message=str(e),
        )
        db.add(log)
        raise HTTPException(status_code=500, detail=str(e))
