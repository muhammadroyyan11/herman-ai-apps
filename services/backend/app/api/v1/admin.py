from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.core.database import get_db
from app.core.security.auth import get_current_user
from app.models.base import User, Conversation, Message, ToolLog

router = APIRouter()


async def require_admin(user: User = Depends(get_current_user)):
    if user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/users")
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).order_by(desc(User.created_at)).offset(skip).limit(limit)
    )
    users = result.scalars().all()
    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "username": u.username,
                "role": u.role,
                "subscription_tier": u.subscription_tier,
                "is_active": u.is_active,
                "is_verified": u.is_verified,
                "api_calls_count": u.api_calls_count,
                "total_tokens_used": u.total_tokens_used,
                "created_at": u.created_at.isoformat(),
            }
            for u in users
        ],
        "total": len(users),
    }


@router.get("/stats")
async def get_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user_count = await db.execute(select(func.count(User.id)))
    conv_count = await db.execute(select(func.count(Conversation.id)))
    msg_count = await db.execute(select(func.count(Message.id)))
    tool_count = await db.execute(select(func.count(ToolLog.id)))

    return {
        "total_users": user_count.scalar(),
        "total_conversations": conv_count.scalar(),
        "total_messages": msg_count.scalar(),
        "total_tool_calls": tool_count.scalar(),
    }


@router.get("/system")
async def system_health(admin: User = Depends(require_admin)):
    try:
        import psutil
        return {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage("/").percent,
            "status": "healthy",
        }
    except ImportError:
        return {"status": "healthy", "note": "psutil not installed"}


@router.get("/logs")
async def get_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ToolLog).order_by(desc(ToolLog.created_at)).offset(skip).limit(limit)
    )
    logs = result.scalars().all()
    return {
        "logs": [
            {
                "id": l.id,
                "tool_name": l.tool_name,
                "status": l.status,
                "duration_ms": l.duration_ms,
                "error_message": l.error_message,
                "created_at": l.created_at.isoformat(),
            }
            for l in logs
        ]
    }
