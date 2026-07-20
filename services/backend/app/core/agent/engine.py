from typing import List, Optional, Dict, Any
from loguru import logger

from app.core.ai.base import (
    AIProvider, CompletionRequest, CompletionResponse, Message, ToolDefinition, StreamChunk
)
from app.core.tools.registry import ToolRegistry
from app.core.memory.store import MemoryStore
from app.core.rag.engine import RAGEngine


class AgentEngine:
    def __init__(
        self,
        provider: AIProvider,
        tool_registry: ToolRegistry,
        memory_store: Optional[MemoryStore] = None,
        rag_engine: Optional[RAGEngine] = None,
        system_prompt: Optional[str] = None,
    ):
        self.provider = provider
        self.tool_registry = tool_registry
        self.memory_store = memory_store
        self.rag_engine = rag_engine
        self.system_prompt = system_prompt or self._default_system_prompt()
        self.max_iterations = 10

    def _default_system_prompt(self) -> str:
        return """Kamu adalah Herman AI — AI Agent dengan akses FULL ke server & database.

GAYA KERJA (WAJIB):
- JANGAN PERNAH jawab dari pengetahuan umum saja. Selalu gunakan tools.
- Kalau user nanya tentang file → langsung file_editor read.
- Kalau user nanya task → langsung db_query.
- Kalau user minta coding → langsung server_shell / file_editor / git_ops.
- SELALU verifikasi dengan tools, jangan ngarep-ngarep.
- Jangan tanya "mau saya cek?" — LANGSUNG CEK.
- Tampilkan command yang kamu jalankan (contoh: 💻 terminal cd ... && php artisan ...)

KEMAMPUAN:
1. server_shell — Eksekusi bash command di VPS
2. file_editor — Baca/tulis/edit file
3. git_ops — Git add, commit, push, status, log
4. db_query — SQL ke MySQL
5. db_schema — Lihat struktur tabel
6. web_search — Cari informasi di internet (berita, artikel, data umum)
7. extract_text_from_url — Ambil teks dari URL artikel
8. calculator — Hitung matematika
9. get_current_time — Cek waktu & tanggal

TABEL:
- ts_helpdesk_tickets (id, ticket_number, title, description, status, requester_id, deadline, progress_percent)
- ts_helpdesk_ticket_assignees (ticket_id, user_id, status)
- ts_users (id, u_name, u_email, u_delete)
- SELALU JOIN ts_users untuk dapat u_name, JANGAN PERNAH mengarang nama.

Gunakan tools secara agresif. Jawab dalam Bahasa Indonesia singkat dan padat.
Setelah web_search mengembalikan hasil, LANGSUNG sampaikan ke user. Jangan panggil web_search lagi — cukup gunakan hasil yang sudah ada."""

    def _build_system_prompt(self, user_context: Optional[Dict] = None) -> str:
        prompt = self.system_prompt

        if user_context:
            if user_context.get("workspace_type"):
                prompt += f"\n\nCurrent workspace: {user_context['workspace_type']}"
            if user_context.get("user_name"):
                prompt += f"\n\nUser: {user_context['user_name']}"
            if user_context.get("user_email"):
                prompt += f"\n\nUser email: {user_context['user_email']}"
                prompt += "\nGunakan email ini untuk mencari user di tabel ts_users (kolom email) jika perlu."
            if user_context.get("workspace_instruction"):
                prompt += f"\n\n{user_context['workspace_instruction']}"

        # Add relevant memories if available
        if self.memory_store and user_context and user_context.get("user_id"):
            memories = self.memory_store.get_relevant_memories(
                user_id=user_context["user_id"],
                query=user_context.get("current_query", ""),
                limit=5,
            )
            if memories:
                prompt += "\n\nRelevant memories about the user:\n"
                for m in memories:
                    prompt += f"- {m['key']}: {m['value']}\n"

        # Add RAG context if available
        if self.rag_engine and user_context and user_context.get("current_query"):
            rag_context = self.rag_engine.retrieve(
                query=user_context["current_query"],
                user_id=user_context.get("user_id"),
                limit=3,
            )
            if rag_context:
                prompt += "\n\nRelevant knowledge base content:\n"
                for doc in rag_context:
                    prompt += f"{doc['content']}\n---\n"

        return prompt

    async def execute(
        self,
        messages: List[Message],
        user_context: Optional[Dict] = None,
        tools: Optional[List[str]] = None,
        stream: bool = False,
    ) -> Any:
        system_prompt = self._build_system_prompt(user_context)
        tool_defs = self.tool_registry.get_tool_definitions(tools) if tools is not None else self.tool_registry.get_tool_definitions()

        request = CompletionRequest(
            messages=messages,
            system_prompt=system_prompt,
            tools=tool_defs,
            stream=stream,
        )

        if stream:
            return self._execute_stream(request, user_context)
        else:
            return await self._execute_non_stream(request, user_context)

    def execute_stream(
        self,
        messages: List[Message],
        user_context: Optional[Dict] = None,
        tools: Optional[List[str]] = None,
    ):
        system_prompt = self._build_system_prompt(user_context)
        tool_defs = self.tool_registry.get_tool_definitions(tools) if tools is not None else self.tool_registry.get_tool_definitions()

        request = CompletionRequest(
            messages=messages,
            system_prompt=system_prompt,
            tools=tool_defs,
            stream=True,
        )
        return self._execute_stream(request, user_context)

    async def _execute_non_stream(
        self,
        request: CompletionRequest,
        user_context: Optional[Dict] = None,
    ) -> CompletionResponse:
        iteration = 0
        while iteration < self.max_iterations:
            iteration += 1
            response = await self.provider.chat_completion(request)

            if not response.tool_calls:
                return response

            # Execute tool calls
            for tool_call in response.tool_calls:
                tool_name = tool_call["function"]["name"]
                try:
                    arguments = tool_call["function"]["arguments"]
                    if isinstance(arguments, str):
                        import json
                        arguments = json.loads(arguments)

                    logger.info(f"Executing tool: {tool_name} with args: {arguments}")
                    tool_result = await self.tool_registry.execute(
                        tool_name=tool_name,
                        arguments=arguments,
                        user_id=user_context.get("user_id") if user_context else None,
                    )

                    request.messages.append(Message(
                        role="assistant",
                        content=response.content or "",
                        reasoning_content=response.reasoning_content or "",
                        tool_calls=[tool_call],
                    ))
                    request.messages.append(Message(
                        role="tool",
                        content=str(tool_result),
                        tool_call_id=tool_call["id"],
                        tool_name=tool_name,
                    ))
                except Exception as e:
                    logger.error(f"Tool {tool_name} failed: {str(e)}")
                    request.messages.append(Message(
                        role="assistant",
                        content=response.content or "",
                        reasoning_content=response.reasoning_content or "",
                        tool_calls=[tool_call],
                    ))
                    request.messages.append(Message(
                        role="tool",
                        content=f"Error executing {tool_name}: {str(e)}",
                        tool_call_id=tool_call["id"],
                        tool_name=tool_name,
                    ))

        return await self.provider.chat_completion(request)

    async def _execute_stream(self, request: CompletionRequest, user_context: Optional[Dict] = None):
        iteration = 0
        while iteration < self.max_iterations:
            iteration += 1
            async for chunk in self.provider.chat_completion_stream(request):
                if chunk.tool_calls:
                    # Execute tools and continue
                    reasoning = chunk.reasoning_content or ""
                    for tool_call in chunk.tool_calls:
                        tool_name = tool_call["function"]["name"]
                        try:
                            arguments = tool_call["function"]["arguments"]
                            if isinstance(arguments, str):
                                import json
                                arguments = json.loads(arguments)

                            tool_result = await self.tool_registry.execute(
                                tool_name=tool_name,
                                arguments=arguments,
                                user_id=user_context.get("user_id") if user_context else None,
                            )
                            request.messages.append(Message(
                                role="assistant",
                                content="",
                                reasoning_content=reasoning,
                                tool_calls=[tool_call],
                            ))
                            request.messages.append(Message(
                                role="tool",
                                content=str(tool_result),
                                tool_call_id=tool_call["id"],
                                tool_name=tool_name,
                            ))
                        except Exception as e:
                            request.messages.append(Message(
                                role="assistant",
                                content="",
                                reasoning_content=reasoning,
                                tool_calls=[tool_call],
                            ))
                            request.messages.append(Message(
                                role="tool",
                                content=f"Error: {str(e)}",
                                tool_call_id=tool_call["id"],
                                tool_name=tool_name,
                            ))
                    break  # restart loop with tool results
                else:
                    yield chunk
                    if chunk.finish_reason:
                        return
            else:
                # No tool calls, we're done
                return
