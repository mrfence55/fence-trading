
import requests
import json
import time
from datetime import datetime, timezone

API_URL = "http://173.214.167.219/api/signals"
# API_URL = "http://localhost:3000/api/signals" # For local testing if possible

def test_upsert():
    print(f"Testing Upsert Logic against {API_URL}")
    
    # 1. Create a base signal
    symbol = "TESTUPSERT"
    channel_id = -1001234567890
    open_ts = int(time.time())
    open_time_str = datetime.fromtimestamp(open_ts, tz=timezone.utc).isoformat()
    
    payload_new = {
        "symbol": symbol,
        "type": "LONG",
        "status": "NEW",
        "entry": 100.0,
        "sl": 90.0,
        "tp1": 110.0,
        "tp2": 120.0,
        "channel_id": channel_id,
        "channel_name": "Test Channel",
        "open_time": open_time_str
    }
    
    print("\n1. Sending NEW signal...")
    try:
        r = requests.post(API_URL, json=payload_new, timeout=5)
        print(f"Response: {r.status_code} - {r.text}")
        data = r.json()
        first_id = data.get('id')
    except Exception as e:
        print(f"Failed: {e}")
        return

    time.sleep(2)
    
    # 2. Send UPDATE (TP HIT) with SAME open_time
    payload_update = payload_new.copy()
    payload_update['status'] = "TP_HIT"
    payload_update['tp_level'] = 1
    payload_update['profit'] = 123
    
    print("\n2. Sending UPDATE (TP HIT)...")
    try:
        r = requests.post(API_URL, json=payload_update, timeout=5)
        print(f"Response: {r.status_code} - {r.text}")
        data = r.json()
        second_id = data.get('id')
        
        if first_id == second_id:
             print("✅ SUCCESS: ID matched (Upsert worked)")
        else:
             print(f"❌ FAILURE: Created NEW row ID {second_id} (Expected {first_id})")
             
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    test_upsert()
