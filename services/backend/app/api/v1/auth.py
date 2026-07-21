from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security.auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    decode_token, get_current_user, get_optional_user
)
from app.models.base import User, Session
from datetime import datetime, timedelta, timezone
from app.config.settings import get_settings

settings = get_settings()

router = APIRouter()


class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str
    display_name: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(User).where((User.email == req.email) | (User.username == req.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email or username already exists")

    user = User(
        email=req.email,
        username=req.username,
        display_name=req.display_name or req.username,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    await db.flush()

    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "message": "Registration successful",
    }


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    session = Session(
        user_id=user.id,
        refresh_token=refresh_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    result = await db.execute(
        select(Session).where(
            Session.refresh_token == req.refresh_token,
            Session.is_active == True,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=401, detail="Session expired")

    access_token = create_access_token({"sub": payload["sub"]})
    refresh_token = create_refresh_token({"sub": payload["sub"]})

    session.refresh_token = refresh_token
    session.is_active = False

    new_session = Session(user_id=payload["sub"], refresh_token=refresh_token)
    db.add(new_session)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout")
async def logout(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Session).where(Session.user_id == user.id, Session.is_active == True)
    )
    sessions = result.scalars().all()
    for session in sessions:
        session.is_active = False
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_me(user: User = Depends(get_optional_user)):
    if not user:
        return {"is_authenticated": False}
    return {
        "is_authenticated": True,
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "role": user.role,
        "subscription_tier": user.subscription_tier,
        "preferences": user.preferences,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }
