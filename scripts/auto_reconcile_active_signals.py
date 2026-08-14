import sqlite3
import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone

TWELVE_DATA_API_KEY = "e319e4cc7cec44ad975841ded108a985"

def normalize_symbol(symbol: str) -> str:
    sym = symbol.upper().strip()
    if sym in ("XAUUSD", "GOLD"): return "XAU/USD"
    if sym in ("BTCUSD", "BTC"): return "BTC/USD"
    if sym in ("ETHUSD", "ETH"): return "ETH/USD"
    if sym in ("NAS100", "US100", "NDX"): return "QQQ"
    if sym in ("US30", "DJI"): return "DIA"
    if len(sym) == 6 and "/" not in sym:
        return f"{sym[:3]}/{sym[3:]}"
    return sym

def parse_iso(ts_str):
    if not ts_str: return None
    clean = ts_str.strip()
    iso = clean if clean.endswith('Z') or '+' in clean else f"{clean}Z"
    try:
        return datetime.fromisoformat(iso.replace('Z', '+00:00'))
    except:
        return None

def reconcile_signals(db_file="web_signals.db"):
    print(f"--- RECONCILING ACTIVE SIGNALS IN {db_file} ---")
    conn = sqlite3.connect(db_file)
    cur = conn.cursor()
    
    cur.execute("""
        SELECT id, symbol, type, entry, sl, tp1, tp2, tp3, tp4, open_time, status, pips, tp_level
        FROM signals
        WHERE status IN ('NEW', 'OPEN', 'ACTIVE', 'open') OR pips IS NULL
        ORDER BY id DESC
    """)
    rows = cur.fetchall()
    print(f"Found {len(rows)} unfinalized/active signals.")

    for row in rows:
        sig_id, symbol, sig_type, entry, sl, tp1, tp2, tp3, tp4, open_time, status, pips, tp_level = row
        if not entry:
            continue
        
        is_buy = "BUY" in (sig_type or "LONG").upper() or "LONG" in (sig_type or "LONG").upper()
        dt_open = parse_iso(open_time) or datetime.now(timezone.utc)
        start_str = dt_open.strftime("%Y-%m-%d %H:%M:%S")
        end_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

        print(f"\nAuditing Signal #{sig_id}: {symbol} {sig_type} Entry={entry} SL={sl} TP1={tp1} TP2={tp2} TP3={tp3}")

        candles = []
        # Crypto check
        if any(c in symbol.upper() for c in ["BTC", "ETH", "SOL"]):
            try:
                pair = symbol.upper().replace("/", "").replace("USD", "USDT")
                start_ms = int(dt_open.timestamp() * 1000)
                b_url = f"https://api.binance.com/api/v3/klines?symbol={pair}&interval=15m&startTime={start_ms}&limit=500"
                with urllib.request.urlopen(b_url, timeout=10) as r:
                    data = json.loads(r.read().decode('utf-8'))
                    candles = [{"high": float(k[2]), "low": float(k[3]), "close": float(k[4]), "time": int(k[0]/1000)} for k in data]
            except Exception as e:
                print(f"Binance fetch error: {e}")
        else:
            # Twelve Data check
            try:
                td_sym = normalize_symbol(symbol)
                td_url = f"https://api.twelvedata.com/time_series?symbol={urllib.parse.quote(td_sym)}&interval=15min&start_date={urllib.parse.quote(start_str)}&end_date={urllib.parse.quote(end_str)}&timezone=UTC&apikey={TWELVE_DATA_API_KEY}"
                with urllib.request.urlopen(td_url, timeout=10) as r:
                    data = json.loads(r.read().decode('utf-8'))
                    if "values" in data:
                        candles = [{"high": float(k["high"]), "low": float(k["low"]), "close": float(k["close"]), "time": int(datetime.fromisoformat(k["datetime"].replace('Z', '+00:00')).timestamp())} for k in data["values"]]
                        candles.reverse() # chronological
            except Exception as e:
                print(f"Twelve Data fetch error: {e}")

        if not candles:
            print(f"No candle data available for {symbol}, keeping current status.")
            continue

        # Evaluate chronologically
        resolved_status = status
        hit_tp_level = 0
        hit_time = None
        calculated_pips = 0

        # Pip multiplier
        pip_mult = 10 if "XAU" in symbol.upper() else 100 if "JPY" in symbol.upper() else 10000 if ("USD" in symbol.upper() or "EUR" in symbol.upper()) else 1

        for c in candles:
            high, low = c["high"], c["low"]
            c_time = datetime.fromtimestamp(c["time"], tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

            # Check SL
            if sl is not None:
                if is_buy and low <= sl:
                    resolved_status = "SL_HIT"
                    calculated_pips = -round(abs(entry - sl) * pip_mult)
                    hit_time = c_time
                    break
                elif not is_buy and high >= sl:
                    resolved_status = "SL_HIT"
                    calculated_pips = -round(abs(entry - sl) * pip_mult)
                    hit_time = c_time
                    break

            # Check TP3, TP2, TP1
            if is_buy:
                if tp3 and high >= tp3:
                    resolved_status = "TP_HIT"
                    hit_tp_level = 3
                    calculated_pips = round(abs(tp3 - entry) * pip_mult)
                    hit_time = c_time
                    break
                elif tp2 and high >= tp2 and hit_tp_level < 2:
                    resolved_status = "TP_HIT"
                    hit_tp_level = 2
                    calculated_pips = round(abs(tp2 - entry) * pip_mult)
                    hit_time = c_time
                elif tp1 and high >= tp1 and hit_tp_level < 1:
                    resolved_status = "TP_HIT"
                    hit_tp_level = 1
                    calculated_pips = round(abs(tp1 - entry) * pip_mult)
                    hit_time = c_time
            else:
                if tp3 and low <= tp3:
                    resolved_status = "TP_HIT"
                    hit_tp_level = 3
                    calculated_pips = round(abs(entry - tp3) * pip_mult)
                    hit_time = c_time
                    break
                elif tp2 and low <= tp2 and hit_tp_level < 2:
                    resolved_status = "TP_HIT"
                    hit_tp_level = 2
                    calculated_pips = round(abs(entry - tp2) * pip_mult)
                    hit_time = c_time
                elif tp1 and low <= tp1 and hit_tp_level < 1:
                    resolved_status = "TP_HIT"
                    hit_tp_level = 1
                    calculated_pips = round(abs(entry - tp1) * pip_mult)
                    hit_time = c_time

        if resolved_status in ("TP_HIT", "SL_HIT"):
            print(f"==> RESOLVED: Signal #{sig_id} is now {resolved_status} (TP Level: {hit_tp_level}, Pips: {calculated_pips}p at {hit_time})")
            cur.execute("""
                UPDATE signals
                SET status = ?, pips = ?, tp_level = ?, timestamp = COALESCE(?, timestamp)
                WHERE id = ?
            """, (resolved_status, calculated_pips, hit_tp_level or 1, hit_time, sig_id))
            conn.commit()
        else:
            print(f"Signal #{sig_id} is still ACTIVE in current market.")

    conn.close()
    print("--- RECONCILIATION COMPLETED ---")

if __name__ == "__main__":
    reconcile_signals("web_signals.db")
