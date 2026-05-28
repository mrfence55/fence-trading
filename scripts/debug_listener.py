from telethon import TelegramClient, events
import asyncio
import os

# ================= CONFIGURATION =================
API_ID = int(os.getenv("API_ID") or os.getenv("TELEGRAM_API_ID") or "0")
API_HASH = os.getenv("API_HASH") or os.getenv("TELEGRAM_API_HASH")
SESSION_NAME = "tg_session"

client = TelegramClient(SESSION_NAME, API_ID, API_HASH)

@client.on(events.NewMessage)
async def handler(event):
    chat = await event.get_chat()
    chat_id = event.chat_id
    chat_title = getattr(chat, 'title', 'Private Chat')
    text = event.raw_text.replace('\n', ' ')[:50]  # First 50 chars
    
    print(f"📩 New Message:")
    print(f"   Chat ID: {chat_id}")
    print(f"   Title:   {chat_title}")
    print(f"   Text:    {text}...")
    print("-" * 30)

async def main():
    print("🕵️‍♂️ Debug Listener Started!")
    print("Waiting for messages... (Press Ctrl+C to stop)")
    await client.run_until_disconnected()

if __name__ == '__main__':
    with client:
        client.loop.run_until_complete(main())
