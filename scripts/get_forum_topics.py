
import asyncio
import os
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.tl.functions.channels import GetForumTopicsRequest

# Config from your bot
API_ID = 27308955
API_HASH = "12c8d6da1b61b738ba1d28b892452783"
SESSION_PATH = "tg_session.txt"

async def main():
    print("=== Telegram Forum Topic Finder ===")
    
    # 1. Load Session
    if not os.path.exists(SESSION_PATH):
        print(f"Error: {SESSION_PATH} not found. Run this where your bot runs.")
        return
        
    with open(SESSION_PATH, 'r') as f:
        session_str = f.read().strip()
        
    client = TelegramClient(StringSession(session_str), API_ID, API_HASH)
    await client.connect()
    
    if not await client.is_user_authorized():
        print("Client not authorized. Please run the main bot first to login.")
        return

    print("Login successful. Fetching 'Fence Trading' group...")

    # 2. Find the correct Group
    target_group = None
    async for dialog in client.iter_dialogs():
        if "Fence Trading" in dialog.name:
            print(f"\nFOUND GROUP: {dialog.name} (ID: {dialog.id})")
            target_group = dialog
            break
    
    if not target_group:
        print("Could not find a group named 'Fence Trading'. Listing all groups with 'Fence'...")
        async for dialog in client.iter_dialogs():
             if "Fence" in dialog.name:
                 print(f" - {dialog.name} (ID: {dialog.id})")
        return

    # 3. Get Topics
    print(f"\nScanning Topics in '{target_group.name}'...")
    try:
        # Note: GetForumTopicsRequest might fetch in batches, but limit=100 is usually enough for manual setup
        result = await client(GetForumTopicsRequest(
            channel=target_group.entity, 
            q="", 
            offset_date=None, 
            offset_id=0, 
            offset_topic=0, 
            limit=100
        ))
        
        print("\n=== TOPIC LIST (COPY THESE IDs) ===")
        print(f"Group ID: {target_group.id}")
        print("-" * 40)
        for topic in result.topics:
            print(f"Topic: {topic.title}")
            print(f"ID:    {topic.id}")
            print("-" * 40)
            
    except Exception as e:
        print(f"Error fetching topics: {e}")
        print("Make sure the group is actually a Forum (Supergroup with Topics enabled).")

if __name__ == "__main__":
    asyncio.run(main())
