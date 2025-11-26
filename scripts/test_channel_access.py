from telethon import TelegramClient
from telethon.sessions import StringSession
import asyncio
import os
import sys

# Config from the main script
API_ID   = 27308955
API_HASH = "12c8d6da1b61b738ba1d28b892452783"

# Determine the directory of the script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Assuming tg_session.txt is in the parent directory (project root) or same dir
# Based on previous file views, it seems to be in the root or scripts?
# Let's try to find it.
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR) # fence-trading
SESSION_STRING_PATH = os.path.join(PROJECT_ROOT, "tg_session.txt")

TARGET_CHANNEL_ID = -1001220837618 # Updated to the ID user tried

async def main():
    # 1. Find Session File
    session_path = "tg_session.txt"
    if not os.path.exists(session_path):
        # Try looking in the script's directory
        session_path = os.path.join(SCRIPT_DIR, "tg_session.txt")
        if not os.path.exists(session_path):
             # Try looking in the project root
            session_path = os.path.join(PROJECT_ROOT, "tg_session.txt")
            if not os.path.exists(session_path):
                print(f"❌ Error: Could not find 'tg_session.txt' in current dir, scripts dir, or project root.")
                print("Please run the main bot first to login and generate this file.")
                return

    print(f"Using session file: {session_path}")

    try:
        with open(session_path, "r") as f:
            sess_str = f.read().strip()
    except Exception as e:
        print(f"Error reading session file: {e}")
        return

    client = TelegramClient(StringSession(sess_str), API_ID, API_HASH)
    await client.connect()
    
    if not await client.is_user_authorized():
        print("Error: Client is not authorized. Please run the main bot to login.")
        return

    # 2. Try IDs
    # User mentioned "-1220837618" (with k in url usually means -100 prefix)
    ids_to_try = [
        -1001220837618, # Most likely for a channel
        -1220837618,    # Raw ID
        1220837618      # Positive ID
    ]

    found = False
    for target_id in ids_to_try:
        print(f"\nTrying ID: {target_id}...")
        try:
            entity = await client.get_entity(target_id)
            title = getattr(entity, 'title', 'Unknown Title')
            print(f"✅ SUCCESS! Found channel: '{title}' (ID: {entity.id})")
            
            print(f"--- Last 3 Messages from {title} ---")
            messages = await client.get_messages(entity, limit=3)
            
            if not messages:
                print("No messages found.")
            
            for msg in messages:
                date = msg.date.strftime('%Y-%m-%d %H:%M:%S')
                text = (msg.text or "<No Text>").replace('\n', ' ')[:100]
                print(f"[{date}] {text}...")
            
            found = True
            break # Stop after finding it
            
        except ValueError:
            print(f"   Could not find entity with ID {target_id}")
        except Exception as e:
            print(f"   Error accessing {target_id}: {e}")

    if not found:
        print("\n❌ Could not access the channel with any of the tested IDs.")
        print("Please ensure the bot account has JOINED the channel.")

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
