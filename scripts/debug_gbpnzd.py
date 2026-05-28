import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

# Load env for API Key
load_dotenv()

# Import the actual bot logic to test exact behavior
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from telegramTP_checker_td_tp4_eco import td_time_series_1m, hit_seq_for_interval, TD_KEY as TD_API_KEY

async def debug_gbpnzd():
    symbol = "GBPNZD"
    side = "LONG"
    entry = 2.33550
    sl = 2.32550
    tps = [2.33750, 2.34050, 2.34750]
    
    # Time context
    # Signal Open: Jan 5, ~11:43 UTC (from screenshot)
    # TP2 Hit Expected: Jan 6 (according to user screenshot)
    
    # Let's fetch the last 3 days of data
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    start_ms = now_ms - (3 * 24 * 60 * 60 * 1000) # 3 days ago

    print(f"🔍 Fetching {symbol} data from 12Data (key ends in {TD_API_KEY[-4:]})...")
    print(f"   Range: {datetime.fromtimestamp(start_ms/1000, tz=timezone.utc)} to NOW")

    ohlcv = await td_time_series_1m(symbol, start_ms)
    
    print(f"📊 Received {len(ohlcv)} candles.")
    
    if not ohlcv:
        print("❌ No data received!")
        return

    # 1. Check for Highest High
    max_h = -1.0
    max_h_time = ""
    
    print("\n--- Candle Analysis (checking for TP2: 2.34050) ---")
    for c in ohlcv:
        # c = [open_ms, open, high, low, close, volume]
        ts_ms = c[0]
        h = c[2]
        l = c[3]
        dt = datetime.fromtimestamp(ts_ms/1000, tz=timezone.utc)
        
        if h > max_h:
            max_h = h
            max_h_time = dt.isoformat()
            
        # Log if we are close to TP2
        if h >= 2.34000:
             print(f"[{dt}] High: {h} | Low: {l} {'✅ HIT TP2' if h >= 2.34050 else '❌ NEAR MISS'}")

    print(f"\n📈 Highest Price Found: {max_h} at {max_h_time}")
    
    # 2. Run actual logic
    print("\n--- Running Logic ---")
    hits, hit_ts, sl_hit, special = hit_seq_for_interval(symbol, side, sl, tps, ohlcv, 0)
    
    print(f"Logic Result: Hits={hits}, Time={hit_ts}, SL_Hit={sl_hit}")
    
    if hits >= 2:
        print("✅ Logic says TP2 HIT! (Why didn't it update?)")
    else:
        print("❌ Logic says TP2 NOT HIT.")

if __name__ == "__main__":
    asyncio.run(debug_gbpnzd())
