import requests
import json
import time

API_URL = "http://localhost:3000/api/signals"

def test_send_signal():
    print(f"Testing Signal API at {API_URL}...")
    
    payload = {
        "symbol": "BTC/USD",
        "type": "LONG",
        "status": "TP_HIT",
        "pips": 50.5,
        "tp_level": 2,
        "channel_id": 123456789,
        "channel_name": "Test Channel",
        "risk_pips": 25.0,
        "reward_pips": 50.5,
        "rr_ratio": 2.02,
        "profit": 2020.0
    }
    
    try:
        response = requests.post(API_URL, json=payload)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Signal sent successfully!")
        else:
            print("❌ Failed to send signal.")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Is the local server running? (npm run dev)")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_send_signal()
