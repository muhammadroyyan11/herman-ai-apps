from typing import Optional
import httpx
from loguru import logger
from app.config.settings import get_settings

settings = get_settings()


class SearchEngine:
    async def search(self, query: str, num_results: int = 5) -> list[dict]:
        if settings.SERPER_API_KEY:
            return await self._search_serper(query, num_results)
        elif settings.TAVILY_API_KEY:
            return await self._search_tavily(query, num_results)
        elif settings.BRAVE_API_KEY:
            return await self._search_brave(query, num_results)
        else:
            logger.warning("No search API configured")
            return []

    async def _search_serper(self, query: str, num_results: int) -> list[dict]:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                "https://google.serper.dev/search",
                headers={"X-API-KEY": settings.SERPER_API_KEY},
                json={"q": query, "num": num_results},
            )
            data = response.json()
            return [
                {
                    "title": item.get("title", ""),
                    "url": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                }
                for item in data.get("organic", [])[:num_results]
            ]

    async def _search_tavily(self, query: str, num_results: int) -> list[dict]:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": settings.TAVILY_API_KEY,
                    "query": query,
                    "max_results": num_results,
                },
            )
            data = response.json()
            return [
                {
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "snippet": r.get("content", ""),
                }
                for r in data.get("results", [])
            ]

    async def _search_brave(self, query: str, num_results: int) -> list[dict]:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip",
                    "X-Subscription-Token": settings.BRAVE_API_KEY,
                },
                params={"q": query, "count": num_results},
            )
            data = response.json()
            return [
                {
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "snippet": r.get("description", ""),
                }
                for r in data.get("web", {}).get("results", [])
            ]
