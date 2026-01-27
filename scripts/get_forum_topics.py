
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

    # 3. Get Topics (Robust Scan Method)
    print(f"\nScanning recent messages in '{target_group.name}' to find Topics...")
    print("This might take 10-20 seconds...")
    topics_found = {}

    try:
        # Scan last 500 messages to see where they were sent
        async for message in client.iter_messages(target_group.entity, limit=500):
            # Check if message belongs to a topic
            if message.reply_to and message.reply_to.forum_topic:
                topic_id = message.reply_to.reply_to_msg_id
                
                # If we haven't seen this topic yet, try to fetch its name
                if topic_id not in topics_found:
                    try:
                        # Try to get the first message of the topic which contains the title
                        # or just store "Topic {id}" if we can't find it
                        topic_start_msg = await client.get_messages(target_group.entity, ids=topic_id)
                        
                        if topic_start_msg and topic_start_msg.action:
                             # usually MessageActionTopicCreate
                             if hasattr(topic_start_msg.action, 'title'):
                                 topics_found[topic_id] = topic_start_msg.action.title
                             else:
                                 topics_found[topic_id] = f"Topic {topic_id} (No Title)"
                        else:
                             topics_found[topic_id] = f"Topic {topic_id} (Unknown Title)"
                             
                    except Exception:
                        topics_found[topic_id] = f"Topic {topic_id}"
        
        print("\n=== TOPIC LIST (COPY THESE IDs) ===")
        print(f"Group ID: {target_group.id}")
        print("-" * 40)
        
        if not topics_found:
             print("No topics found in the last 500 messages. Send a message in each topic and try again.")
        
        for t_id, t_name in topics_found.items():
            print(f"Topic: {t_name}")
            print(f"ID:    {t_id}")
            print("-" * 40)
            
    except Exception as e:
        print(f"Error scanning messages: {e}")

if __name__ == "__main__":
    asyncio.run(main())
