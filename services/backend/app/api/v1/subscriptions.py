from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.security.auth import get_current_user
from app.models.base import Subscription, User

router = APIRouter()


@router.get("/current")
async def get_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.status.in_(["active", "trial"]),
        )
    )
    subscription = result.scalar_one_or_none()

    if not subscription:
        return {
            "plan": "free",
            "status": "active",
            "features": get_free_features(),
        }

    return {
        "id": subscription.id,
        "plan": subscription.plan,
        "status": subscription.status,
        "features": subscription.features,
        "started_at": subscription.started_at.isoformat(),
        "expires_at": subscription.expires_at.isoformat() if subscription.expires_at else None,
    }


@router.get("/plans")
async def list_plans():
    return {
        "plans": [
            {
                "id": "free",
                "name": "Free",
                "price": 0,
                "features": get_free_features(),
            },
            {
                "id": "pro",
                "name": "Pro",
                "price": 9.99,
                "features": {
                    "max_conversations": "unlimited",
                    "max_tokens_per_month": 1000000,
                    "tools_enabled": True,
                    "rag_enabled": True,
                    "voice_enabled": True,
                    "custom_providers": True,
                    "max_file_size_mb": 50,
                },
            },
            {
                "id": "enterprise",
                "name": "Enterprise",
                "price": 49.99,
                "features": {
                    "max_conversations": "unlimited",
                    "max_tokens_per_month": "unlimited",
                    "tools_enabled": True,
                    "rag_enabled": True,
                    "voice_enabled": True,
                    "custom_providers": True,
                    "max_file_size_mb": 500,
                    "team_members": 10,
                    "admin_dashboard": True,
                    "priority_support": True,
                    "self_hosted": True,
                },
            },
        ]
    }


def get_free_features() -> dict:
    return {
        "max_conversations": 50,
        "max_tokens_per_month": 100000,
        "tools_enabled": True,
        "rag_enabled": False,
        "voice_enabled": True,
        "custom_providers": False,
        "max_file_size_mb": 10,
    }
