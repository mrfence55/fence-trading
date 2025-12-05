import json
import urllib.request
import urllib.error
from datetime import datetime, timezone

# Configuration
API_URL = "http://localhost:3000/api/signals"

# Test Data representing different channels and outcomes
TEST_SIGNALS = [
    {
        "symbol": "XAUUSD",
        "type": "BUY",
        "status": "TP_HIT",
        "pips": 45,
        "tp_level": 2,
        "is_win": True,
        "channel_id": -1002154812244,
        "channel_name": "Aurora (Gold)",
        "risk_pips": 30,
        "reward_pips": 45,
        "rr_ratio": 1.5,
        "profit": 1500,
        "open_time": datetime.now(timezone.utc).isoformat()
    },
    {
        "symbol": "EURUSD",
        "type": "SELL",
        "status": "TP_HIT",
        "pips": 20,
        "tp_level": 1,
        "is_win": True,
        "channel_id": -1001220837618,
        "channel_name": "Odin",
        "risk_pips": 15,
        "reward_pips": 20,
        "rr_ratio": 1.33,
        "profit": 1333,
        "open_time": datetime.now(timezone.utc).isoformat()
    },
    {
        "symbol": "GBPUSD",
        "type": "BUY",
        "status": "SL_HIT",
        "pips": -25,
        "tp_level": 0,
        "is_win": False,
        "channel_id": -1001239815745,
        "channel_name": "Fence Trading",
        "risk_pips": 25,
        "reward_pips": 0,
        "rr_ratio": -1.0,
        "profit": -1000,
        "open_time": datetime.now(timezone.utc).isoformat()
    },
    {
        "symbol": "BTCUSD",
        "type": "BUY",
        "status": "TP_HIT",
        "pips": 1500,
        "tp_level": 4,
        "is_win": True,
        "channel_id": -1002208969496,
        "channel_name": "Fence Crypto",
        "risk_pips": 500,
        "reward_pips": 1500,
        "rr_ratio": 3.0,
        "profit": 3000,
        "open_time": datetime.now(timezone.utc).isoformat()
    },
    {
        "symbol": "US30",
        "type": "SELL",
        "status": "TP_HIT",
        "pips": 120,
        "tp_level": 3,
        "is_win": True,
        "channel_id": -1001979286278,
        "channel_name": "Fence Live",
        "risk_pips": 50,
        "reward_pips": 120,
        "rr_ratio": 2.4,
        "profit": 2400,
        "open_time": datetime.now(timezone.utc).isoformat()
    }
]

def send_signal(signal):
    try:
        data = json.dumps(signal).encode('utf-8')
        req = urllib.request.Request(API_URL, data=data, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req) as response:
            print(f"✅ Sent {signal['symbol']} ({signal['channel_name']}): Status {response.status}")
    except urllib.error.URLError as e:
        print(f"❌ Failed to send {signal['symbol']}: {e}")

if __name__ == "__main__":
    print(f"🚀 Sending {len(TEST_SIGNALS)} test signals to {API_URL}...")
    for sig in TEST_SIGNALS:
        send_signal(sig)
    print("Done! Check the website.")
