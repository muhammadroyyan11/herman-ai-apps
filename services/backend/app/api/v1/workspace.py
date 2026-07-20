from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security.auth import get_current_user
from app.models.base import Workspace, User

router = APIRouter()


class CreateWorkspaceRequest(BaseModel):
    name: str
    workspace_type: str = "personal"
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    tools_enabled: Optional[list[str]] = None
    settings: Optional[dict] = None


@router.get("")
async def list_workspaces(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Workspace).where(Workspace.user_id == user.id, Workspace.is_deleted == False)
    )
    workspaces = result.scalars().all()
    return {
        "workspaces": [
            {
                "id": w.id,
                "name": w.name,
                "slug": w.slug,
                "description": w.description,
                "workspace_type": w.workspace_type,
                "icon": w.icon,
                "color": w.color,
                "is_default": w.is_default,
                "tools_enabled": w.tools_enabled,
                "settings": w.settings,
                "created_at": w.created_at.isoformat(),
            }
            for w in workspaces
        ]
    }


@router.post("")
async def create_workspace(
    req: CreateWorkspaceRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import re
    slug = re.sub(r"[^a-z0-9-]", "", req.name.lower().replace(" ", "-"))

    workspace = Workspace(
        user_id=user.id,
        name=req.name,
        slug=slug,
        description=req.description,
        workspace_type=req.workspace_type,
        icon=req.icon,
        color=req.color,
    )
    if req.tools_enabled is not None:
        workspace.tools_enabled = req.tools_enabled
    if req.settings is not None:
        workspace.settings = req.settings
    db.add(workspace)
    await db.flush()

    return {
        "id": workspace.id,
        "name": workspace.name,
        "slug": workspace.slug,
        "workspace_type": workspace.workspace_type,
        "message": "Workspace created",
    }


@router.get("/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id, Workspace.user_id == user.id)
    )
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return {
        "id": workspace.id,
        "name": workspace.name,
        "slug": workspace.slug,
        "description": workspace.description,
        "workspace_type": workspace.workspace_type,
        "icon": workspace.icon,
        "color": workspace.color,
        "is_default": workspace.is_default,
        "tools_enabled": workspace.tools_enabled,
        "settings": workspace.settings,
        "created_at": workspace.created_at.isoformat(),
    }


class UpdateWorkspaceRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    tools_enabled: Optional[list[str]] = None
    settings: Optional[dict] = None


@router.put("/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    req: UpdateWorkspaceRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id, Workspace.user_id == user.id)
    )
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if req.name is not None:
        workspace.name = req.name
    if req.description is not None:
        workspace.description = req.description
    if req.icon is not None:
        workspace.icon = req.icon
    if req.color is not None:
        workspace.color = req.color
    if req.tools_enabled is not None:
        workspace.tools_enabled = req.tools_enabled
    if req.settings is not None:
        workspace.settings = req.settings

    return {"message": "Workspace updated"}


@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id, Workspace.user_id == user.id)
    )
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    workspace.is_deleted = True
    return {"message": "Workspace deleted"}
