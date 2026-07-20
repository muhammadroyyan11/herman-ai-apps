from typing import AsyncGenerator, List, Optional, Dict, Any
import httpx, json
from app.core.ai.base import AIProvider, CompletionRequest, CompletionResponse, StreamChunk
from app.config.settings import get_settings

settings = get_settings()


class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str = None, base_url: str = None, model: str = None):
        self._api_key = api_key or settings.OPENAI_API_KEY
        self._base_url = base_url or settings.OPENAI_BASE_URL
        self._model = model or settings.OPENAI_MODEL

    @property
    def provider_name(self) -> str: return "openai"
    @property
    def default_model(self) -> str: return self._model

    def _prepare(self, request: CompletionRequest) -> dict:
        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        for m in request.messages:
            msg = {"role": m.role, "content": m.content}
            if m.tool_calls: msg["tool_calls"] = m.tool_calls
            if m.tool_call_id: msg["tool_call_id"] = m.tool_call_id
            messages.append(msg)
        return {
            "model": request.model or self._model,
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": request.stream,
        }

    async def chat_completion(self, request: CompletionRequest) -> CompletionResponse:
        payload = self._prepare(request)
        if request.tools:
            payload["tools"] = [{"type": "function", "function": {"name": t.name, "description": t.description, "parameters": t.input_schema}} for t in request.tools]
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(f"{self._base_url}/chat/completions", headers={"Authorization": f"Bearer {self._api_key}"}, json=payload)
            r.raise_for_status()
            d = r.json()
            c = d["choices"][0]["message"]
            return CompletionResponse(content=c.get("content","") or "", tool_calls=c.get("tool_calls"), finish_reason=d["choices"][0].get("finish_reason"), usage=d.get("usage"), model=d.get("model"))

    async def chat_completion_stream(self, request: CompletionRequest) -> AsyncGenerator[StreamChunk, None]:
        payload = self._prepare(request)
        payload["stream"] = True
        if request.tools:
            payload["tools"] = [{"type": "function", "function": {"name": t.name, "description": t.description, "parameters": t.input_schema}} for t in request.tools]
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", f"{self._base_url}/chat/completions", headers={"Authorization": f"Bearer {self._api_key}"}, json=payload) as resp:
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "): continue
                    d = line[6:].strip()
                    if d == "[DONE]": yield StreamChunk(finish_reason="stop"); return
                    if not d: continue
                    try:
                        data = json.loads(d)
                        delta = data["choices"][0].get("delta", {})
                        yield StreamChunk(content=delta.get("content"), tool_calls=delta.get("tool_calls"), finish_reason=data["choices"][0].get("finish_reason"), usage=data.get("usage"))
                        if data["choices"][0].get("finish_reason"): return
                    except json.JSONDecodeError: continue

    async def create_embedding(self, text: str) -> List[float]:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(f"{self._base_url}/embeddings", headers={"Authorization": f"Bearer {self._api_key}"}, json={"model": "text-embedding-3-small", "input": text})
            return r.json()["data"][0]["embedding"]
