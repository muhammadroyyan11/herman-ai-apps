from typing import AsyncGenerator, List, Optional, Dict, Any
import httpx, json
from app.core.ai.base import AIProvider, CompletionRequest, CompletionResponse, StreamChunk, Message
from app.config.settings import get_settings

settings = get_settings()


class AnthropicProvider(AIProvider):
    def __init__(self, api_key: str = None, base_url: str = None, model: str = None):
        self._api_key = api_key or settings.ANTHROPIC_API_KEY
        self._base_url = base_url or settings.ANTHROPIC_BASE_URL
        self._model = model or settings.ANTHROPIC_MODEL

    @property
    def provider_name(self) -> str: return "anthropic"
    @property
    def default_model(self) -> str: return self._model

    def _prepare(self, request: CompletionRequest) -> dict:
        system = request.system_prompt or ""
        msgs = []
        for m in request.messages:
            if m.role == "system": system += f"\n{m.content}"
            elif m.role == "tool":
                msgs.append({"role": "user", "content": [{"type": "tool_result", "tool_use_id": m.tool_call_id, "content": m.content}]})
            else:
                content = []
                if m.content: content.append({"type": "text", "text": m.content})
                if m.tool_calls:
                    for tc in m.tool_calls:
                        content.append({"type": "tool_use", "id": tc["id"], "name": tc["function"]["name"], "input": json.loads(tc["function"]["arguments"])})
                msgs.append({"role": m.role, "content": content})
        return {"model": request.model or self._model, "system": system, "messages": msgs, "max_tokens": request.max_tokens, "temperature": request.temperature, "stream": request.stream}

    async def chat_completion(self, request: CompletionRequest) -> CompletionResponse:
        payload = self._prepare(request)
        if request.tools:
            payload["tools"] = [{"name": t.name, "description": t.description, "input_schema": t.input_schema} for t in request.tools]
        async with httpx.AsyncClient(timeout=60, headers={"x-api-key": self._api_key, "anthropic-version": "2023-06-01"}) as client:
            r = await client.post(f"{self._base_url}/messages", json=payload)
            r.raise_for_status()
            d = r.json()
            content = ""
            for c in d.get("content", []):
                if c["type"] == "text": content += c["text"]
            return CompletionResponse(content=content, usage={"input_tokens": d.get("usage",{}).get("input_tokens",0), "output_tokens": d.get("usage",{}).get("output_tokens",0)}, model=d.get("model"))

    async def chat_completion_stream(self, request: CompletionRequest) -> AsyncGenerator[StreamChunk, None]:
        payload = self._prepare(request)
        payload["stream"] = True
        if request.tools: payload["tools"] = [{"name": t.name, "description": t.description, "input_schema": t.input_schema} for t in request.tools]
        async with httpx.AsyncClient(timeout=120, headers={"x-api-key": self._api_key, "anthropic-version": "2023-06-01"}) as client:
            async with client.stream("POST", f"{self._base_url}/messages", json=payload) as resp:
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "): continue
                    d = line[6:].strip()
                    if d == "[DONE]": yield StreamChunk(finish_reason="stop"); return
                    if not d: continue
                    try:
                        data = json.loads(d)
                        if data.get("type") == "content_block_delta":
                            yield StreamChunk(content=data["delta"].get("text"))
                        elif data.get("type") == "message_stop":
                            yield StreamChunk(finish_reason="stop"); return
                    except json.JSONDecodeError: continue

    async def create_embedding(self, text: str) -> List[float]:
        raise NotImplementedError("Anthropic does not provide embeddings API")
