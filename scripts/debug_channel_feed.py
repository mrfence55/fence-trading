
import asyncio
import os
from telethon import TelegramClient
from telethon.sessions import StringSession

# ================= CONFIG =================
API_ID = 27308955
API_HASH = "12c8d6da1b61b738ba1d28b892452783"
SESSION_PATH = "tg_session.txt"

async def main():
    print("=== Channel Feed Debugger ===")
    
    if not os.path.exists(SESSION_PATH):
        print(f"Error: {SESSION_PATH} not found.")
        return
        
    with open(SESSION_PATH, 'r') as f:
        session_str = f.read().strip()
        
    client = TelegramClient(StringSession(session_str), API_ID, API_HASH)
    await client.connect()
    
    print("Logged in. Listing recent messages from ALL Dialogs containing 'Gold', 'Forex', 'Fred'...")
    
    relevant_ids = []
    
    async for dialog in client.iter_dialogs():
        name = dialog.name
        if any(x in name.lower() for x in ["gold", "forex", "fred", "fence", "tfxc"]):
            print(f"\nChecked Channel: {name} (ID: {dialog.id})")
            
            # Print last 3 messages
            try:
                messages = await client.get_messages(dialog, limit=3)
                if not messages:
                    print("   [No messages]")
                for m in messages:
                    # Sanitize
                    txt = (m.text or "").replace('\n', ' ')[:100]
                    print(f"   - [{m.date.strftime('%H:%M')}] {txt}")
            except Exception as e:
                print(f"   [Error fetching messages: {e}]")
                
    print("\n=== Done. Compare these IDs with your Config! ===")

if __name__ == "__main__":
    asyncio.run(main())
