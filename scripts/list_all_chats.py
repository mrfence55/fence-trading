import asyncio
import os
from telethon import TelegramClient
from telethon.sessions import StringSession
from telegramTP_checker_td_tp4_eco import API_ID, API_HASH, SESSION_STRING_PATH

async def main():
    print("🚀 Listing all accessible Telegram Chats...")
    
    if not os.path.exists(SESSION_STRING_PATH):
   |\     print(f"❌ Session file not found at {SESSION_STRING_PATH}")
        return

    with open(SESSION_STRING_PATH, "r") as f:
        session_str = f.read().strip()

    client = TelegramClient(StringSession(session_str), API_ID, API_HASH)
    
    try:
        await client.connect()
        if not await client.is_user_authorized():
            print("❌ Client not authorized.")
            return
            
        me = await client.get_me()
        print(f"✅ Logged in as: {me.first_name} (ID: {me.id})")
        print("-" * 60)
        print(f"{'ID':<20} | {'Type':<10} | {'Title'}")
        print("-" * 60)
        
        async for dialog in client.iter_dialogs():
            entity = dialog.entity
            d_type = "User"
            if entity.broadcast: d_type = "Channel"
            elif entity.megagroup: d_type = "Supergroup"
            elif entity.gigagroup: d_type = "Gigagroup"
            elif hasattr(entity, 'chat') and entity.chat: d_type = "Group"
            
            print(f"{entity.id:<20} | {d_type:<10} | {dialog.name}")
            
        print("-" * 60)
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
