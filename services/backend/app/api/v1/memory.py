from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security.auth import get_current_user
from app.core.memory.store import MemoryStore
from app.models.base import User

router = APIRouter()


class SaveMemoryRequest(BaseModel):
    key: str
    value: str
    category: str = "general"
    importance: float = 0.5


@router.get("")
async def list_memories(
    category: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    store = MemoryStore(db)
    memories = await store.get_all_memories(
        user_id=user.id, category=category, skip=skip, limit=limit
    )
    return {"memories": memories}


@router.post("")
async def save_memory(
    req: SaveMemoryRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    store = MemoryStore(db)
    memory = await store.save_memory(
        user_id=user.id,
        key=req.key,
        value=req.value,
        category=req.category,
        importance=req.importance,
    )
    return {
        "id": memory.id,
        "key": memory.key,
        "value": memory.value,
        "category": memory.category,
        "message": "Memory saved",
    }


@router.get("/{memory_id}")
async def get_memory(
    memory_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    store = MemoryStore(db)
    memory = await store.get_memory(user_id=user.id, key=memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {
        "id": memory.id,
        "key": memory.key,
        "value": memory.value,
        "category": memory.category,
        "importance": memory.importance,
    }


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    store = MemoryStore(db)
    deleted = await store.delete_memory(memory_id=memory_id, user_id=user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"message": "Memory deleted"}
