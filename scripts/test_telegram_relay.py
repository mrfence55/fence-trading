import asyncio
import os
from telethon import TelegramClient
from telethon.sessions import StringSession
from telegramTP_checker_td_tp4_eco import (
    CHANNELS_CONFIG, 
    format_signal_smart, 
    API_ID, 
    API_HASH, 
    SESSION_STRING_PATH
)

# Dummy signal data for testing
TEST_SIGNAL_DATA = {
    "symbol": "TEST-USD",
    "side": "buy",
    "entry": 1234.56,
    "sl": 1200.00,
    "tps": [1240.00, 1250.00, 1260.00, 1270.00],
    "raw_text": "This is a TEST signal to verify relay functionality."
}

async def main():
    print("🚀 Starting Telegram Relay Test...")
    
    # Check if session file exists
    if not os.path.exists(SESSION_STRING_PATH):
        print(f"❌ Session file not found at {SESSION_STRING_PATH}")
        return

    # Read session string
    with open(SESSION_STRING_PATH, "r") as f:
        session_str = f.read().strip()

    client = TelegramClient(StringSession(session_str), API_ID, API_HASH)
    
    try:
        await client.connect()
        if not await client.is_user_authorized():
            print("❌ Client not authorized. Please run the main bot first to login.")
            return
            
        me = await client.get_me()
        print(f"✅ Connected as: {me.first_name} (ID: {me.id})")
        
        print(f"\nTesting relay to {len(CHANNELS_CONFIG)} channels:")
        
        for source_id, config in CHANNELS_CONFIG.items():
            alias = config["alias"]
            target_id = config["target_id"]
            asset_type = config.get("type", "UNKNOWN")
            
            print(f"\n--------------------------------------------------")
            print(f"Testing: {alias} ({asset_type})")
            print(f"Source ID: {source_id} -> Target ID: {target_id}")
            
            # Format signal
            smart_text = format_signal_smart(
                alias, 
                asset_type, 
                TEST_SIGNAL_DATA["side"], 
                TEST_SIGNAL_DATA["symbol"], 
                TEST_SIGNAL_DATA["entry"], 
                TEST_SIGNAL_DATA["sl"], 
                TEST_SIGNAL_DATA["tps"], 
                TEST_SIGNAL_DATA["raw_text"]
            )
            
            # Add a clear TEST header
            test_message = f"🧪 **SYSTEM TEST - IGNORE** 🧪\n\n{smart_text}"
            
            try:
                await client.send_message(target_id, test_message)
                print(f"✅ Success! Message sent to {alias}.")
            except Exception as e:
                print(f"❌ Failed to send to {alias}: {e}")
                
        print(f"\n--------------------------------------------------")
        print("✅ Test completed.")
        
    except Exception as e:
        print(f"❌ specific error: {e}")
    finally:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
