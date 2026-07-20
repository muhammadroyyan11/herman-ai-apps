from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncGenerator, List, Optional, Dict, Any


@dataclass
class Message:
    role: str  # user, assistant, system, tool
    content: str
    reasoning_content: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_call_id: Optional[str] = None
    tool_name: Optional[str] = None
    name: Optional[str] = None


@dataclass
class ToolDefinition:
    name: str
    description: str
    input_schema: Dict[str, Any]
    output_schema: Optional[Dict[str, Any]] = None


@dataclass
class CompletionRequest:
    messages: List[Message]
    system_prompt: Optional[str] = None
    tools: Optional[List[ToolDefinition]] = None
    temperature: float = 0.7
    max_tokens: int = 4096
    top_p: float = 0.95
    stream: bool = False
    model: Optional[str] = None
    stop: Optional[List[str]] = None
    extra_params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CompletionResponse:
    content: str
    reasoning_content: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    finish_reason: Optional[str] = None
    usage: Optional[Dict[str, int]] = None
    model: Optional[str] = None


@dataclass
class StreamChunk:
    content: Optional[str] = None
    reasoning_content: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    finish_reason: Optional[str] = None
    usage: Optional[Dict[str, int]] = None


class AIProvider(ABC):
    @abstractmethod
    async def chat_completion(
        self, request: CompletionRequest
    ) -> CompletionResponse:
        pass

    @abstractmethod
    async def chat_completion_stream(
        self, request: CompletionRequest
    ) -> AsyncGenerator[StreamChunk, None]:
        pass

    @abstractmethod
    async def create_embedding(self, text: str) -> List[float]:
        pass

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @property
    @abstractmethod
    def default_model(self) -> str:
        pass
