
import asyncio
import os
from telethon import TelegramClient
from telethon.sessions import StringSession

# ================= CONFIG =================
API_ID = 27308955
API_HASH = "12c8d6da1b61b738ba1d28b892452783"
SESSION_PATH = "tg_session.txt"

# Config matches your bot
FORUM_GROUP_ID = -1003713831351

CHANNELS_CONFIG = {
    -1002154812244: {"alias": "Fence - Aurora",   "topic_id": 2},
    -1001220837618: {"alias": "Fence - Odin",     "topic_id": 6},
    -1001239815745: {"alias": "Fence - Main",     "topic_id": 12},
    -1002208969496: {"alias": "Fence - Crypto",   "topic_id": 7},
    -1001979286278: {"alias": "Fence - Live",     "topic_id": 8}
}
# ==========================================

async def main():
    print("=== Forum Topic Connection Test ===")
    
    # 1. Load Session
    if not os.path.exists(SESSION_PATH):
        print(f"Error: {SESSION_PATH} not found. Run this where your bot runs.")
        return
        
    with open(SESSION_PATH, 'r') as f:
        session_str = f.read().strip()
        
    client = TelegramClient(StringSession(session_str), API_ID, API_HASH)
    await client.connect()
    
    if not await client.is_user_authorized():
        print("Client not authorized.")
        return

    print(f"Target Group ID: {FORUM_GROUP_ID}\n")

    # 2. Iterate and Send Tests
    for chat_id, config in CHANNELS_CONFIG.items():
        alias = config["alias"]
        topic_id = config["topic_id"]
        
        print(f"Testing: {alias} (Topic ID: {topic_id})...")
        
        try:
            msg = f"TEST: Connection verified for **{alias}** ✅"
            await client.send_message(FORUM_GROUP_ID, msg, reply_to=topic_id)
            print(f" -> Success! Check the '{alias}' topic.")
        except Exception as e:
            print(f" -> FAILED: {e}")
            print(f"    (Make sure Bot is Admin and Group ID is correct)")

    print("\nDone. Check your Telegram Group!")

if __name__ == "__main__":
    asyncio.run(main())
