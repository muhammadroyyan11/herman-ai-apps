from typing import AsyncGenerator, List, Optional, Dict, Any
import httpx, json
from app.core.ai.base import AIProvider, CompletionRequest, CompletionResponse, StreamChunk
from app.config.settings import get_settings

settings = get_settings()


class GeminiProvider(AIProvider):
    def __init__(self, api_key: str = None, base_url: str = None, model: str = None):
        self._api_key = api_key or settings.GEMINI_API_KEY
        self._model = model or settings.GEMINI_MODEL

    @property
    def provider_name(self) -> str: return "gemini"
    @property
    def default_model(self) -> str: return self._model

    def _prepare(self, request: CompletionRequest) -> dict:
        contents = []
        for m in request.messages:
            if m.role in ("user", "assistant"):
                contents.append({"role": "user" if m.role == "user" else "model", "parts": [{"text": m.content}]})
        payload = {"contents": contents, "generationConfig": {"temperature": request.temperature, "maxOutputTokens": request.max_tokens, "topP": request.top_p}}
        if request.tools:
            payload["tools"] = [{"functionDeclarations": [{"name": t.name, "description": t.description, "parameters": t.input_schema} for t in request.tools]}]
        return payload

    async def chat_completion(self, request: CompletionRequest) -> CompletionResponse:
        payload = self._prepare(request)
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(f"https://generativelanguage.googleapis.com/v1beta/models/{self._model}:generateContent?key={self._api_key}", json=payload)
            r.raise_for_status()
            d = r.json()
            text = d.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            return CompletionResponse(content=text, model=self._model)

    async def chat_completion_stream(self, request: CompletionRequest) -> AsyncGenerator[StreamChunk, None]:
        payload = self._prepare(request)
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", f"https://generativelanguage.googleapis.com/v1beta/models/{self._model}:streamGenerateContent?key={self._api_key}", json=payload) as resp:
                async for line in resp.aiter_lines():
                    if not line: continue
                    try:
                        d = json.loads(line)
                        text = d.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if text: yield StreamChunk(content=text)
                    except json.JSONDecodeError: continue
                yield StreamChunk(finish_reason="stop")

    async def create_embedding(self, text: str) -> List[float]:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={self._api_key}", json={"model": "models/text-embedding-004", "content": {"parts": [{"text": text}]}})
            return r.json()["embedding"]["values"]
