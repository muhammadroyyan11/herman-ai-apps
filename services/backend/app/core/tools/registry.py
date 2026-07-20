from typing import Dict, List, Optional, Any, Callable, Awaitable
from loguru import logger
from app.core.ai.base import ToolDefinition


class Tool:
    def __init__(
        self,
        name: str,
        description: str,
        handler: Callable[..., Awaitable[Any]],
        input_schema: Dict[str, Any],
        output_schema: Optional[Dict[str, Any]] = None,
        permissions: Optional[List[str]] = None,
        timeout: int = 30,
        requires_auth: bool = False,
        is_enabled: bool = True,
    ):
        self.name = name
        self.description = description
        self.handler = handler
        self.input_schema = input_schema
        self.output_schema = output_schema
        self.permissions = permissions or []
        self.timeout = timeout
        self.requires_auth = requires_auth
        self.is_enabled = is_enabled

    def to_definition(self) -> ToolDefinition:
        return ToolDefinition(
            name=self.name,
            description=self.description,
            input_schema=self.input_schema,
            output_schema=self.output_schema,
        )


class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Tool] = {}

    def register(self, tool: Tool):
        self._tools[tool.name] = tool
        logger.info(f"Tool registered: {tool.name}")

    def register_many(self, tools: List[Tool]):
        for tool in tools:
            self.register(tool)

    def unregister(self, name: str):
        self._tools.pop(name, None)

    def get(self, name: str) -> Optional[Tool]:
        return self._tools.get(name)

    def get_tool_definitions(self, tool_names: Optional[List[str]] = None) -> List[ToolDefinition]:
        if tool_names:
            return [
                self._tools[name].to_definition()
                for name in tool_names
                if name in self._tools and self._tools[name].is_enabled
            ]
        return [
            tool.to_definition()
            for tool in self._tools.values()
            if tool.is_enabled
        ]

    def get_enabled_tools(self) -> Dict[str, Tool]:
        return {name: tool for name, tool in self._tools.items() if tool.is_enabled}

    async def execute(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        user_id: Optional[str] = None,
    ) -> Any:
        tool = self.get(tool_name)
        if not tool:
            raise ValueError(f"Tool '{tool_name}' not found")
        if not tool.is_enabled:
            raise ValueError(f"Tool '{tool_name}' is disabled")
        if tool.requires_auth and not user_id:
            raise PermissionError(f"Tool '{tool_name}' requires authentication")

        logger.info(f"Executing tool: {tool_name} by user {user_id or 'anonymous'}")
        try:
            result = await tool.handler(**arguments)
            return result
        except Exception as e:
            logger.error(f"Tool {tool_name} execution failed: {str(e)}")
            raise


# Global registry instance
tool_registry = ToolRegistry()
