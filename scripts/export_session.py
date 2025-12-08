"""
Export session string from debug_session.session to tg_session.txt
"""
from telethon import TelegramClient

API_ID   = 27308955
API_HASH = "12c8d6da1b61b738ba1d28b892452783"

async def main():
    # Load the existing debug_session
    client = TelegramClient("debug_session", API_ID, API_HASH)
    await client.start()
    
    # Check if we're logged in
    me = await client.get_me()
    print(f"✅ Logged in as: {me.first_name} ({me.phone})")
    
    # Export as string session
    session_string = StringSession.save(client.session)
    
    print(f"✅ Session string extracted! ({len(session_string)} chars)")
    
    with open("tg_session.txt", "w") as f:
        f.write(session_string)
    
    print("✅ Saved to tg_session.txt")
    await client.disconnect()

if __name__ == "__main__":
    import asyncio
    from telethon.sessions import StringSession
    asyncio.run(main())
