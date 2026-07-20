from typing import AsyncGenerator, List, Optional, Dict, Any
import httpx, json
from app.core.ai.base import AIProvider, CompletionRequest, CompletionResponse, StreamChunk


class OllamaProvider(AIProvider):
    def __init__(self, api_key: str = None, base_url: str = None, model: str = None):
        self._base_url = (base_url or "http://localhost:11434").rstrip("/")
        self._model = model or "llama3"

    @property
    def provider_name(self) -> str: return "ollama"
    @property
    def default_model(self) -> str: return self._model

    def _prepare(self, request: CompletionRequest) -> dict:
        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        for m in request.messages:
            messages.append({"role": m.role, "content": m.content})
        return {"model": request.model or self._model, "messages": messages, "stream": request.stream, "options": {"temperature": request.temperature}}

    async def chat_completion(self, request: CompletionRequest) -> CompletionResponse:
        payload = self._prepare(request)
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(f"{self._base_url}/api/chat", json=payload)
            r.raise_for_status()
            d = r.json()
            return CompletionResponse(content=d.get("message", {}).get("content", ""), model=d.get("model"))

    async def chat_completion_stream(self, request: CompletionRequest) -> AsyncGenerator[StreamChunk, None]:
        payload = self._prepare(request)
        async with httpx.AsyncClient(timeout=300) as client:
            async with client.stream("POST", f"{self._base_url}/api/chat", json=payload) as resp:
                async for line in resp.aiter_lines():
                    if not line: continue
                    try:
                        d = json.loads(line)
                        if d.get("done"): yield StreamChunk(finish_reason="stop"); return
                        yield StreamChunk(content=d.get("message", {}).get("content", ""))
                    except json.JSONDecodeError: continue

    async def create_embedding(self, text: str) -> List[float]:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(f"{self._base_url}/api/embeddings", json={"model": self._model, "prompt": text})
            return r.json()["embedding"]
