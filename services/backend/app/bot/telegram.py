import httpx
from loguru import logger
from app.config.settings import get_settings


class TelegramBot:
    def __init__(self):
        self.settings = get_settings()
        self.token = self.settings.TELEGRAM_BOT_TOKEN
        self.allowed_users = [
            int(u.strip()) for u in self.settings.TELEGRAM_ALLOWED_USERS.split(",") if u.strip()
        ] if self.settings.TELEGRAM_ALLOWED_USERS else []
        self.api_base = f"https://api.telegram.org/bot{self.token}"
        self._offset = 0

    async def _request(self, method: str, data: dict = None) -> dict:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(f"{self.api_base}/{method}", json=data or {})
            return r.json()

    async def send_message(self, chat_id: int, text: str, parse_mode: str = "Markdown"):
        return await self._request("sendMessage", {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
        })

    async def send_chat_action(self, chat_id: int, action: str = "typing"):
        return await self._request("sendChatAction", {
            "chat_id": chat_id,
            "action": action,
        })

    async def get_updates(self) -> list:
        result = await self._request("getUpdates", {
            "offset": self._offset,
            "timeout": 30,
        })
        if result.get("ok"):
            updates = result["result"]
            if updates:
                self._offset = updates[-1]["update_id"] + 1
            return updates
        return []

    def is_allowed(self, user_id: int) -> bool:
        return user_id in self.allowed_users if self.allowed_users else True


class HermanTelegramBot:
    def __init__(self, backend_url: str = "http://localhost:9876"):
        self.bot = TelegramBot()
        self.backend_url = backend_url

    async def start(self):
        logger.info("Telegram bot started, waiting for messages...")
        while True:
            try:
                updates = await self.bot.get_updates()
                for update in updates:
                    await self._handle_update(update)
            except Exception as e:
                logger.error(f"Telegram poll error: {e}")
                import asyncio
                await asyncio.sleep(5)

    async def _handle_update(self, update: dict):
        msg = update.get("message") or update.get("callback_query", {}).get("message")
        if not msg:
            return

        chat_id = msg["chat"]["id"]
        user_id = msg["from"]["id"]

        if not self.bot.is_allowed(user_id):
            await self.bot.send_message(chat_id, "Maaf, kamu tidak punya akses ke bot ini.")
            return

        text = msg.get("text", "")
        if not text:
            return

        if text.startswith("/"):
            await self._handle_command(chat_id, user_id, text)
            return

        await self.bot.send_chat_action(chat_id, "typing")

        try:
            result = await self._call_agent(text)
            content = result.get("content", "")
            if content:
                await self.bot.send_message(chat_id, content)
        except Exception as e:
            logger.error(f"Agent call failed: {e}")
            await self.bot.send_message(chat_id, f"Error: {str(e)[:200]}")

    async def _handle_command(self, chat_id: int, user_id: int, cmd: str):
        if cmd == "/start":
            await self.bot.send_message(
                chat_id,
                "Halo! Aku Herman AI — bisa bantu coding, cek task, dan akses server.\n\n"
                "Contoh:\n- task saya apa saja\n- buatin task error login\n- cek file index.blade.php\n- bikin grid kiri kanan"
            )
            return
        await self.bot.send_message(chat_id, f"Perintah `{cmd}` belum dikenal.")

    async def _call_agent(self, text: str) -> dict:
        settings = get_settings()
        async with httpx.AsyncClient(timeout=180) as client:
            r = await client.post(
                f"{self.backend_url}/api/v1/bot/chat",
                headers={"X-API-Key": settings.TELEGRAM_BOT_API_KEY},
                json={"content": text},
            )
            r.raise_for_status()
            return r.json()


_bot_instance: HermanTelegramBot = None


def get_telegram_bot() -> HermanTelegramBot:
    global _bot_instance
    if _bot_instance is None:
        _bot_instance = HermanTelegramBot()
    return _bot_instance
