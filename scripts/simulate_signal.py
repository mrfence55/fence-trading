import asyncio
import aiohttp
import random
from datetime import datetime
from telethon import TelegramClient

# ================= CONFIGURATION =================
API_ID = 27308955
API_HASH = "12c8d6da1b61b738ba1d28b892452783"
SESSION_NAME = "tg_session"
WEBSITE_API_URL = "https://fencetrading.no/api/signals"

# Copied from tekstFraChat.py
CHANNELS_CONFIG = {
    -1002154812244: {"alias": "Aurora (Gold)",   "target_id": -1003369420967, "type": "GOLD"},
    -1001220837618: {"alias": "Odin",            "target_id": -1003396317717, "type": "FOREX"},
    -1001239815745: {"alias": "Fence Trading",   "target_id": -1003330700210, "type": "FOREX"},
    -1002208969496: {"alias": "Fence Crypto",    "target_id": -1003368566412, "type": "CRYPTO"},
    -1001979286278: {"alias": "Fence Live",      "target_id": -1003437413343, "type": "INDICES"}
}

ASSET_STYLES = {
    "GOLD":    {"emoji": "🏆", "color": "🟨", "tag": "#XAUUSD #GOLD"},
    "CRYPTO":  {"emoji": "🚀", "color": "🟦", "tag": "#CRYPTO #BITCOIN"},
    "FOREX":   {"emoji": "💱", "color": "🟩", "tag": "#FOREX #FX"},
    "INDICES": {"emoji": "📈", "color": "🟧", "tag": "#INDICES #US30"},
    "UNKNOWN": {"emoji": "⚡", "color": "⬜", "tag": "#TRADING"}
}

client = TelegramClient(SESSION_NAME, API_ID, API_HASH)

async def send_to_website(data: dict):
    print(f"🌐 Sending to Website: {data['symbol']}...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(WEBSITE_API_URL, json=data) as resp:
                if resp.status == 200:
                    print("✅ Website: Success")
                else:
                    print(f"❌ Website: Failed ({resp.status})")
                    print(await resp.text())
    except Exception as e:
        print(f"❌ Website Error: {e}")

def format_signal(alias, asset_type, side, symbol, entry, sl, tps):
    style = ASSET_STYLES.get(asset_type, ASSET_STYLES["UNKNOWN"])
    emoji = style["emoji"]
    color = style["color"]
    
    msg = f"{emoji} **{alias} TEST** {emoji}\n"
    msg += f"━━━━━━━━━━━━━━━━━━━━\n"
    msg += f"{color} **{symbol}**\n"
    msg += f"**Action:** {side} {entry}\n"
    msg += f"━━━━━━━━━━━━━━━━━━━━\n"
    
    for i, tp in enumerate(tps, 1):
        msg += f"🎯 **TP{i}:** {tp}\n"
    
    if sl:
        msg += f"🛑 **SL:** {sl}\n"
        
    msg += f"━━━━━━━━━━━━━━━━━━━━\n"
    msg += f"🧠 **Analyst Note:**\n_This is a simulated test signal._\n"
    msg += f"{style['tag']}"
        
    return msg

async def main():
    print("🧪 Signal Simulator")
    print("1. Aurora (Gold)")
    print("2. Fence Crypto (Bitcoin)")
    print("3. Odin (Forex)")
    
    choice = input("Choose a channel to simulate (1-3): ")
    
    if choice == "1":
        config = CHANNELS_CONFIG[-1002154812244]
        symbol = "XAUUSD"
        price = "2050.50"
        tps = ["2055.00", "2060.00", "2070.00"]
        sl = "2045.00"
    elif choice == "2":
        config = CHANNELS_CONFIG[-1002208969496]
        symbol = "BTCUSD"
        price = "45000"
        tps = ["46000", "47000", "48000"]
        sl = "44000"
    elif choice == "3":
        config = CHANNELS_CONFIG[-1001220837618]
        symbol = "EURUSD"
        price = "1.0950"
        tps = ["1.0980", "1.1020", "1.1050"]
        sl = "1.0920"
    else:
        print("Invalid choice")
        return

    alias = config["alias"]
    target_id = config["target_id"]
    asset_type = config["type"]
    
    print(f"\n🚀 Simulating {alias} Signal...")
    
    # 1. Send to Website
    await send_to_website({
        "symbol": symbol, "type": "BUY", "status": "OPEN",
        "channel_name": alias, "pips": 0, "tp_level": 0,
        "risk_pips": 50, "reward_pips": 150, "rr_ratio": 3.0, "profit": 0
    })
    
    # 2. Send to Telegram
    formatted_msg = format_signal(alias, asset_type, "BUY", symbol, price, sl, tps)
    print(f"\n📨 Sending to Telegram Channel ({target_id})...")
    
    await client.start()
    try:
        await client.send_message(target_id, formatted_msg)
        print("✅ Telegram: Sent")
    except Exception as e:
        print(f"❌ Telegram Error: {e}")

if __name__ == '__main__':
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
