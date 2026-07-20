import json
from typing import AsyncGenerator, List, Optional, Dict, Any
import httpx
from loguru import logger

from app.core.ai.base import (
    AIProvider, CompletionRequest, CompletionResponse, StreamChunk, Message, ToolDefinition
)
from app.config.settings import get_settings

settings = get_settings()


class DeepSeekProvider(AIProvider):
    def __init__(self, api_key: str = None, base_url: str = None, model: str = None):
        self._api_key = api_key or settings.DEEPSEEK_API_KEY
        self._base_url = base_url or settings.DEEPSEEK_BASE_URL
        self._model = model or settings.DEEPSEEK_MODEL

    @property
    def provider_name(self) -> str:
        return "deepseek"

    @property
    def default_model(self) -> str:
        return self._model

    def _prepare_messages(self, request: CompletionRequest) -> List[Dict]:
        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        for msg in request.messages:
            m = {"role": msg.role, "content": msg.content}
            if msg.reasoning_content is not None:
                m["reasoning_content"] = msg.reasoning_content
            if msg.tool_calls:
                m["tool_calls"] = msg.tool_calls
            if msg.tool_call_id:
                m["tool_call_id"] = msg.tool_call_id
            if msg.name:
                m["name"] = msg.name
            messages.append(m)
        return messages

    def _prepare_tools(self, tools: List[ToolDefinition]) -> List[Dict]:
        return [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.input_schema,
                },
            }
            for t in tools
        ]

    async def chat_completion(self, request: CompletionRequest) -> CompletionResponse:
        messages = self._prepare_messages(request)
        payload = {
            "model": request.model or self._model,
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "top_p": request.top_p,
            "stream": False,
        }
        if request.tools:
            payload["tools"] = self._prepare_tools(request.tools)
        if request.stop:
            payload["stop"] = request.stop
        payload.update(request.extra_params)

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self._base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            if not response.is_success:
                logger.error(f"DeepSeek API error: {response.status_code} {response.text[:500]}")
                logger.error(f"Payload: {json.dumps(payload, indent=2)[:2000]}")
            response.raise_for_status()
            data = response.json()
            choice = data["choices"][0]
            msg = choice["message"]

            return CompletionResponse(
                content=msg.get("content", "") or "",
                reasoning_content=msg.get("reasoning_content"),
                tool_calls=msg.get("tool_calls"),
                finish_reason=choice.get("finish_reason"),
                usage=data.get("usage"),
                model=data.get("model"),
            )

    async def chat_completion_stream(
        self, request: CompletionRequest
    ) -> AsyncGenerator[StreamChunk, None]:
        messages = self._prepare_messages(request)
        payload = {
            "model": request.model or self._model,
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "top_p": request.top_p,
            "stream": True,
            "stream_options": {"include_usage": True},
        }
        if request.tools:
            payload["tools"] = self._prepare_tools(request.tools)
        if request.stop:
            payload["stop"] = request.stop
        payload.update(request.extra_params)

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self._base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            ) as response:
                if not response.is_success:
                    body = await response.aread()
                    logger.error(f"DeepSeek streaming error: {response.status_code} {body[:1000]}")
                    logger.error(f"Stream payload: {json.dumps(payload, indent=2)[:2000]}")
                    import tempfile, os
                    with open("/tmp/deepseek_error_payload.json", "w") as f:
                        json.dump({"status": response.status_code, "error": body.decode()[:2000], "payload": payload}, f, indent=2)
                response.raise_for_status()

                # Accumulate tool calls and reasoning content across chunks
                tool_calls_acc: Dict[int, Dict] = {}
                reasoning_acc: str = ""
                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        if tool_calls_acc:
                            yield StreamChunk(
                                tool_calls=[tc for _, tc in sorted(tool_calls_acc.items())],
                                reasoning_content=reasoning_acc or None,
                                finish_reason="tool_calls",
                            )
                        return
                    if not data_str:
                        continue
                    try:
                        data = json.loads(data_str)
                        delta = data["choices"][0].get("delta", {})
                        finish = data["choices"][0].get("finish_reason")

                        # Accumulate reasoning content
                        rc = delta.get("reasoning_content")
                        if rc:
                            reasoning_acc += rc

                        # Accumulate streaming tool calls
                        tc_deltas = delta.get("tool_calls")
                        if tc_deltas:
                            for tc in tc_deltas:
                                idx = tc.get("index", 0)
                                if idx not in tool_calls_acc:
                                    tool_calls_acc[idx] = {
                                        "id": tc.get("id", ""),
                                        "type": "function",
                                        "function": {
                                            "name": "",
                                            "arguments": "",
                                        },
                                    }
                                acc = tool_calls_acc[idx]
                                if tc.get("id"):
                                    acc["id"] = tc["id"]
                                if tc.get("function"):
                                    fn = tc["function"]
                                    if fn.get("name"):
                                        acc["function"]["name"] = fn["name"]
                                    if fn.get("arguments"):
                                        acc["function"]["arguments"] += fn["arguments"]
                            continue

                        if finish == "tool_calls" and tool_calls_acc:
                            yield StreamChunk(
                                tool_calls=[tc for _, tc in sorted(tool_calls_acc.items())],
                                reasoning_content=reasoning_acc or None,
                                finish_reason=finish,
                            )
                            return

                        yield StreamChunk(
                            content=delta.get("content"),
                            reasoning_content=rc or None,
                            finish_reason=finish,
                            usage=data.get("usage"),
                        )

                        if finish:
                            return
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to parse streaming data: {data_str}")
                        continue

    async def create_embedding(self, text: str) -> List[float]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self._base_url}/embeddings",
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "deepseek-embedding",
                    "input": text,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["data"][0]["embedding"]
