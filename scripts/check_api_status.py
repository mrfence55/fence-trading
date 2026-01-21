import requests
import json
import sys

# Define a test payload that matches the expected schema roughly
payload = {
    "symbol": "DEBUGCHECK",
    "status": "TEST",
    "side": "LONG",
    "entry": 1.0,
    "tp1": 1.1,
    "sl": 0.9,
    "fingerprint": "DEBUG_CHECK_123"
}

urls = [
    "http://127.0.0.1:3000/api/signals",
    "https://fencetrading.no/api/signals"
]

print("--- API DIAGNOSTIC TOOL ---")
print("This script checks if the Website API is reachable and accepting POST requests.")
print("It tests both Localhost (internal) and the Public Domain (external).")

for url in urls:
    print(f"\nTesting URL: {url}")
    try:
        r = requests.post(url, json=payload, timeout=5)
        print(f"Status Code: {r.status_code}")
        
        if r.status_code == 200:
            print("SUCCESS! The API key accepted the request.")
        elif r.status_code == 405:
            print("FAILURE (405): Method Not Allowed. The server rejected the POST request.")
            print("  -> This usually means an old version of the website is running.")
        else:
            print(f"FAILURE ({r.status_code}): Unexpected response.")
            print(f"Response Body: {r.text[:200]}")
            
    except requests.exceptions.ConnectionError:
        print("ERROR: Connection Refused. Is the server running?")
    except Exception as e:
        print(f"ERROR: {e}")

print("\n---------------------------")
