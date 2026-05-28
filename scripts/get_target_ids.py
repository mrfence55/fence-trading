from telethon import TelegramClient, events
import asyncio
import os
from dotenv import load_dotenv

load_dotenv("fenceWeb.env")

BOT_TOKEN = os.getenv("BOT_TOKEN") or os.getenv("TELEGRAM_BOT_TOKEN")
API_ID = int(os.getenv("API_ID") or os.getenv("TELEGRAM_API_ID") or "0")
API_HASH = os.getenv("API_HASH") or os.getenv("TELEGRAM_API_HASH")

if not BOT_TOKEN or not API_ID or not API_HASH:
    raise RuntimeError("Missing Telegram bot credentials in fenceWeb.env")

bot = TelegramClient("bot_session", API_ID, API_HASH).start(bot_token=BOT_TOKEN)

@bot.on(events.NewMessage)
async def handler(event):
    chat = await event.get_chat()
    print(f"✅ Message received from:")
    print(f"   Name: {getattr(chat, 'title', 'Unknown')}")
    print(f"   ID:   {chat.id}")
    print("-" * 30)

async def main():
    print("🤖 Bot is listening for messages...")
    print("👉 Please send a message (e.g. 'test') in each of your new channels.")
    print("   I will print the ID here immediately.")
    await bot.run_until_disconnected()

if __name__ == "__main__":
    bot.loop.run_until_complete(main())
