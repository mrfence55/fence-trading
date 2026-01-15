
import asyncio
from telethon import TelegramClient
from telethon.sessions import StringSession

# Config from main bot
API_ID = 27308955
API_HASH = "12c8d6da1b61b738ba1d28b892452783"
SESSION_PATH = "tg_session.txt"
# Fred Crypto Source Channel
CRYPTO_CHANNEL_ID = -1002208969496 

async def main():
    print("=== DUMPING CRYPTO HISTORY ===")
    
    try:
        with open(SESSION_PATH, "r") as f:
            sess_str = f.read().strip()
    except FileNotFoundError:
        print("Error: tg_session.txt not found. Run this on the VPS!")
        return

    client = TelegramClient(StringSession(sess_str), API_ID, API_HASH)
    await client.connect()

    if not await client.is_user_authorized():
        print("Error: Session not authorized.")
        return

    print(f"Fetching last 100 messages from {CRYPTO_CHANNEL_ID}...")
    
    messages = []
    async for msg in client.iter_messages(CRYPTO_CHANNEL_ID, limit=100):
        # Format: Date | ID | ReplyTo | Content
        reply_to = msg.reply_to_msg_id if msg.reply_to_msg_id else "None"
        text = msg.text.replace("\n", "\\n") if msg.text else "[Media/No Text]"
        
        line = f"Date: {msg.date} | ID: {msg.id} | ReplyTo: {reply_to} | {text}"
        messages.append(line)
        print(line)

    with open("crypto_dump.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(messages))

    print(f"\nSaved {len(messages)} messages to crypto_dump.txt")
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
