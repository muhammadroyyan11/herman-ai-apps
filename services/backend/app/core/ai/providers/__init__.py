from app.core.ai.providers.deepseek import DeepSeekProvider
from app.core.ai.providers.openai import OpenAIProvider
from app.core.ai.providers.anthropic import AnthropicProvider
from app.core.ai.providers.gemini import GeminiProvider
from app.core.ai.providers.ollama import OllamaProvider

PROVIDER_MAP = {
    "deepseek": DeepSeekProvider,
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "gemini": GeminiProvider,
    "ollama": OllamaProvider,
}


def get_provider(provider_name: str, api_key: str = None, base_url: str = None, model: str = None):
    provider_cls = PROVIDER_MAP.get(provider_name.lower())
    if not provider_cls:
        raise ValueError(f"Unsupported AI provider: {provider_name}. Supported: {list(PROVIDER_MAP.keys())}")
    return provider_cls(api_key=api_key, base_url=base_url, model=model)
