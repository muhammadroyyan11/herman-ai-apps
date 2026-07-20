import hashlib
from typing import List, Optional, Dict, Any
from loguru import logger
from app.config.settings import get_settings
from app.core.ai.providers import get_provider

settings = get_settings()


class RAGEngine:
    def __init__(self):
        self.provider = get_provider("deepseek")
        self.collection_name = settings.QDRANT_COLLECTION
        self._qdrant_client = None

    @property
    def qdrant(self):
        if self._qdrant_client is None:
            from qdrant_client import QdrantClient
            self._qdrant_client = QdrantClient(
                host=settings.QDRANT_HOST,
                port=settings.QDRANT_PORT,
            )
            self._ensure_collection()
        return self._qdrant_client

    def _ensure_collection(self):
        from qdrant_client.http.models import VectorParams, Distance
        collections = self._qdrant_client.get_collections().collections
        exists = any(c.name == self.collection_name for c in collections)
        if not exists:
            self._qdrant_client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
            )
            logger.info(f"Created Qdrant collection: {self.collection_name}")

    def _chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=overlap,
            separators=["\n\n", "\n", ".", " ", ""],
        )
        return splitter.split_text(text)

    async def _get_embedding(self, text: str) -> List[float]:
        return await self.provider.create_embedding(text)

    async def index_document(
        self,
        document_id: str,
        content: str,
        user_id: Optional[str] = None,
        metadata: Optional[Dict] = None,
    ):
        from qdrant_client.http.models import PointStruct

        chunks = self._chunk_text(content)
        logger.info(f"Indexing document {document_id}: {len(chunks)} chunks")

        points = []
        for i, chunk in enumerate(chunks):
            embedding = await self._get_embedding(chunk)
            point_id = hashlib.md5(f"{document_id}_{i}".encode()).hexdigest()
            points.append(PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "document_id": document_id,
                    "chunk_index": i,
                    "content": chunk,
                    "user_id": user_id,
                    **(metadata or {}),
                },
            ))

        self.qdrant.upsert(
            collection_name=self.collection_name,
            points=points,
        )
        return len(chunks)

    async def retrieve(
        self,
        query: str,
        user_id: Optional[str] = None,
        limit: int = 5,
        score_threshold: float = 0.7,
    ) -> List[Dict[str, Any]]:
        query_vector = await self._get_embedding(query)

        filter_condition = None
        if user_id:
            from qdrant_client.http.models import Filter, FieldCondition, MatchValue
            filter_condition = Filter(
                must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
            )

        results = self.qdrant.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=limit,
            query_filter=filter_condition,
            score_threshold=score_threshold,
        )

        return [
            {
                "content": r.payload["content"],
                "document_id": r.payload.get("document_id"),
                "score": r.score,
                "chunk_index": r.payload.get("chunk_index"),
            }
            for r in results
        ]

    async def delete_document(self, document_id: str):
        from qdrant_client.http.models import Filter, FieldCondition, MatchValue
        self.qdrant.delete(
            collection_name=self.collection_name,
            points_selector=Filter(
                must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
            ),
        )
        logger.info(f"Deleted document {document_id} from vector store")
