import httpx
import json
import re
import base64
import warnings
import asyncio
from datetime import datetime
from app.core.tools.registry import Tool, tool_registry

warnings.filterwarnings("ignore", message=".*SSL.*")


async def calculator(expression: str) -> str:
    try:
        result = eval(expression, {"__builtins__": {}}, {"abs": abs, "round": round, "min": min, "max": max, "sum": sum, "pow": pow})
        return str(result)
    except Exception as e:
        return f"Error: {str(e)}"


async def get_current_time(timezone: str = "UTC") -> str:
    now = datetime.utcnow()
    return now.strftime("%Y-%m-%d %H:%M:%S UTC")


async def _duckduckgo_search(query: str) -> str:
    try:
        from ddgs import DDGS
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, lambda: list(DDGS().text(query, max_results=5)))
        if results:
            lines = []
            for r in results:
                lines.append(f"- {r.get('title', '')}: {r.get('href', '')}")
                if r.get('body'):
                    lines.append(f"  {r['body'][:200]}")
            return "\n".join(lines)
    except Exception:
        pass
    return ""


async def web_search(query: str) -> str:
    from app.config.settings import get_settings
    settings = get_settings()
    if settings.SERPER_API_KEY:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                "https://google.serper.dev/search",
                headers={"X-API-KEY": settings.SERPER_API_KEY},
                json={"q": query},
            )
            data = response.json()
            results = []
            for item in data.get("organic", [])[:5]:
                results.append(f"- {item['title']}: {item['link']}")
            return "\n".join(results) if results else "No results found."

    result = await _duckduckgo_search(query)
    if result:
        return result

    try:
        async with httpx.AsyncClient(timeout=15, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}, follow_redirects=True, trust_env=False) as client:
            response = await client.get("https://www.bing.com/search", params={"q": query})
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(response.text, "html.parser")
        results = []
        for result in soup.select("li.b_algo h2 a")[:5]:
            title = result.get_text(strip=True)
            href = result.get("href", "")
            m = re.search(r"&u=a1([^&]+)", href)
            if m:
                b64 = m.group(1)
                pad = 4 - len(b64) % 4
                if pad != 4:
                    b64 += "=" * pad
                try:
                    href = base64.urlsafe_b64decode(b64).decode("utf-8")
                except Exception:
                    pass
            results.append(f"- {title}: {href}")
        if results:
            return "\n".join(results)
    except Exception:
        pass

    return "Tidak ada hasil yang ditemukan."


async def get_weather(location: str) -> str:
    return f"Weather data for {location}: Sunny, 25°C (simulated - API key required for live data)"


async def currency_converter(amount: float, from_currency: str, to_currency: str) -> str:
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            response = await client.get(
                f"https://api.frankfurter.app/latest?amount={amount}&from={from_currency}&to={to_currency}"
            )
            data = response.json()
            converted = data["rates"][to_currency]
            return f"{amount} {from_currency} = {converted} {to_currency}"
        except Exception as e:
            return f"Conversion error: {str(e)}"


async def extract_text_from_url(url: str) -> str:
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            response = await client.get(url)
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(response.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer"]):
                tag.decompose()
            text = soup.get_text(separator="\n", strip=True)
            return text[:5000]
        except Exception as e:
            return f"Error extracting text: {str(e)}"


def register_builtin_tools():
    from app.core.tools.server_tools import register_server_tools
    register_server_tools()
    tools = [
        Tool(
            name="calculator",
            description="Evaluate a mathematical expression",
            handler=calculator,
            input_schema={
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "The mathematical expression to evaluate (e.g., '2 + 2 * 3')",
                    }
                },
                "required": ["expression"],
            },
        ),
        Tool(
            name="get_current_time",
            description="Get the current date and time",
            handler=get_current_time,
            input_schema={
                "type": "object",
                "properties": {
                    "timezone": {
                        "type": "string",
                        "description": "Timezone (default: UTC)",
                    }
                },
            },
        ),
        Tool(
            name="web_search",
            description="Search the internet for information",
            handler=web_search,
            input_schema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query",
                    }
                },
                "required": ["query"],
            },
        ),
        Tool(
            name="get_weather",
            description="Get current weather for a location",
            handler=get_weather,
            input_schema={
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name or location",
                    }
                },
                "required": ["location"],
            },
        ),
        Tool(
            name="currency_converter",
            description="Convert currency from one to another",
            handler=currency_converter,
            input_schema={
                "type": "object",
                "properties": {
                    "amount": {"type": "number", "description": "Amount to convert"},
                    "from_currency": {"type": "string", "description": "Source currency code (e.g., USD)"},
                    "to_currency": {"type": "string", "description": "Target currency code (e.g., EUR)"},
                },
                "required": ["amount", "from_currency", "to_currency"],
            },
        ),
        Tool(
            name="extract_text_from_url",
            description="Extract readable text content from a URL",
            handler=extract_text_from_url,
            input_schema={
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "URL to extract text from"},
                },
                "required": ["url"],
            },
        ),
    ]
    tool_registry.register_many(tools)
