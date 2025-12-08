"""
Export session string from debug_session.session to tg_session.txt
"""
from telethon import TelegramClient

API_ID   = 27308955
API_HASH = "12c8d6da1b61b738ba1d28b892452783"

async def main():
    client = TelegramClient("debug_session", API_ID, API_HASH)
    await client.connect()
    
    session_string = client.session.save()
    
    print("✅ Session string extracted!")
    print(f"Length: {len(session_string)} characters")
    
    with open("tg_session.txt", "w") as f:
        f.write(session_string)
    
    print("✅ Saved to tg_session.txt")
    await client.disconnect()

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
