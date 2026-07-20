from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.chat import router as chat_router
from app.api.v1.workspace import router as workspace_router
from app.api.v1.agent import router as agent_router
from app.api.v1.tools import router as tools_router
from app.api.v1.rag import router as rag_router
from app.api.v1.memory import router as memory_router
from app.api.v1.users import router as users_router
from app.api.v1.admin import router as admin_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.subscriptions import router as subscriptions_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.bot import router as bot_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(chat_router, prefix="/chat", tags=["Chat"])
api_router.include_router(workspace_router, prefix="/workspaces", tags=["Workspaces"])
api_router.include_router(agent_router, prefix="/agent", tags=["AI Agent"])
api_router.include_router(tools_router, prefix="/tools", tags=["Tools"])
api_router.include_router(rag_router, prefix="/rag", tags=["RAG"])
api_router.include_router(memory_router, prefix="/memory", tags=["Memory"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(subscriptions_router, prefix="/subscriptions", tags=["Subscriptions"])
api_router.include_router(webhooks_router, prefix="/webhooks", tags=["Webhooks"])
api_router.include_router(admin_router, prefix="/admin", tags=["Admin"])
api_router.include_router(bot_router, prefix="", tags=["Bot"])
