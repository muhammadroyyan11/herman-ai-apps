from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from loguru import logger
from app.models.base import AIMemory


class MemoryStore:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def save_memory(
        self,
        user_id: str,
        key: str,
        value: str,
        category: str = "general",
        importance: float = 0.5,
    ) -> AIMemory:
        result = await self.db.execute(
            select(AIMemory).where(
                AIMemory.user_id == user_id,
                AIMemory.key == key,
                AIMemory.is_active == True,
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.value = value
            existing.importance = importance
            existing.category = category
            memory = existing
        else:
            memory = AIMemory(
                user_id=user_id,
                key=key,
                value=value,
                category=category,
                importance=importance,
            )
            self.db.add(memory)

        logger.info(f"Memory saved for user {user_id}: {key}")
        return memory

    async def get_memory(self, user_id: str, key: str) -> Optional[AIMemory]:
        result = await self.db.execute(
            select(AIMemory).where(
                AIMemory.user_id == user_id,
                AIMemory.key == key,
                AIMemory.is_active == True,
            )
        )
        return result.scalar_one_or_none()

    async def get_relevant_memories(
        self,
        user_id: str,
        query: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        conditions = [AIMemory.user_id == user_id, AIMemory.is_active == True]
        if category:
            conditions.append(AIMemory.category == category)

        result = await self.db.execute(
            select(AIMemory)
            .where(*conditions)
            .order_by(AIMemory.importance.desc())
            .limit(limit)
        )
        memories = result.scalars().all()

        return [
            {
                "id": m.id,
                "key": m.key,
                "value": m.value,
                "category": m.category,
                "importance": m.importance,
                "created_at": m.created_at.isoformat(),
            }
            for m in memories
        ]

    async def get_all_memories(
        self,
        user_id: str,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        conditions = [AIMemory.user_id == user_id, AIMemory.is_active == True]
        if category:
            conditions.append(AIMemory.category == category)

        result = await self.db.execute(
            select(AIMemory)
            .where(*conditions)
            .order_by(AIMemory.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        memories = result.scalars().all()

        return [
            {
                "id": m.id,
                "key": m.key,
                "value": m.value,
                "category": m.category,
                "importance": m.importance,
                "created_at": m.created_at.isoformat(),
            }
            for m in memories
        ]

    async def delete_memory(self, memory_id: str, user_id: str) -> bool:
        result = await self.db.execute(
            select(AIMemory).where(
                AIMemory.id == memory_id,
                AIMemory.user_id == user_id,
            )
        )
        memory = result.scalar_one_or_none()
        if memory:
            memory.is_active = False
            return True
        return False

    async def extract_and_save_memories(
        self, user_id: str, conversation_text: str
    ):
        """Extract memories from conversation using AI and save them."""
        from app.core.ai.base import CompletionRequest, Message
        from app.core.ai.providers import get_provider

        provider = get_provider("deepseek")
        prompt = f"""Extract personal memories from this conversation.
Return as JSON array: [{{"key": "fact about user", "value": "detail", "category": "general|preference|fact|context", "importance": 0.0-1.0}}]
Only include factual, important information that should be remembered.

Conversation:
{conversation_text}"""

        request = CompletionRequest(
            messages=[Message(role="user", content=prompt)],
            max_tokens=1000,
            temperature=0.1,
        )
        response = await provider.chat_completion(request)

        import json
        try:
            memories_data = json.loads(response.content)
            for mem in memories_data:
                await self.save_memory(
                    user_id=user_id,
                    key=mem["key"],
                    value=mem["value"],
                    category=mem.get("category", "general"),
                    importance=mem.get("importance", 0.5),
                )
            logger.info(f"Extracted {len(memories_data)} memories for user {user_id}")
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Failed to extract memories: {e}")
