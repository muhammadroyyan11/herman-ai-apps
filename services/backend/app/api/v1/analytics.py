from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.security.auth import get_current_user
from app.models.base import User, Conversation, Message

router = APIRouter()


@router.get("/usage")
async def get_usage(
    days: int = Query(7, ge=1, le=90),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)

    total_conv = await db.execute(
        select(func.count(Conversation.id)).where(
            Conversation.user_id == user.id,
            Conversation.created_at >= since,
        )
    )
    total_msg = await db.execute(
        select(func.count(Message.id)).where(
            Message.conversation_id.in_(
                select(Conversation.id).where(Conversation.user_id == user.id)
            ),
            Message.created_at >= since,
        )
    )

    return {
        "total_conversations": total_conv.scalar(),
        "total_messages": total_msg.scalar(),
        "period_days": days,
    }
