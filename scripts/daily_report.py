
import asyncio
import csv
import re
import os
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple
from telethon import TelegramClient
from telethon.sessions import StringSession
from telegramTP_checker_td_tp4_eco import CHANNELS_CONFIG, API_ID, API_HASH, SESSION_STRING_PATH

# Reuse Parser Logic (Copied to ensure standalone execution without huge imports)
SIG_RX_CLASSIC = re.compile(r'(?P<symbol>[A-Za-z]{3,5}/?[A-Za-z]{3})\s+(?P<side>LONG|SHORT)\b.*?(?:entry|entry\s*price|ep|enter|entry\s*at)[^\d]*?(?P<entry>[-+]?\d*[\,\.]?\d+).*?(?:sl|stop\s*loss)[:\s]*?(?P<sl>[-+]?\d*[\,\.]?\d+).*?(?:tp1|tp\s*1|take\s*profit\s*1)[:=\s]*?(?P<tp1>[-+]?\d*[\,\.]?\d+)(?:.*?(?:tp2|tp\s*2|take\s*profit\s*2)[:=\s]*?(?P<tp2>[-+]?\d*[\,\.]?\d+))?(?:.*?(?:tp3|tp\s*3|take\s*profit\s*3)[:=\s]*?(?P<tp3>[-+]?\d*[\,\.]?\d+))?(?:.*?(?:tp4|tp\s*4|take\s*profit\s*4)[:=\s]*?(?P<tp4>[-+]?\d*[\,\.]?\d+))?', re.IGNORECASE | re.DOTALL)
SIG_RX_BUYSELL = re.compile(r'(?P<side_word>BUY|SELL)\s+(?P<symbol>[A-Za-z]{3,5}/?[A-Za-z]{3}).*?(?:entry|entry\s*at|entry\s*price|ep|enter)[^\d]*?(?P<entry>[-+]?\d*[\,\.]?\d+).*?(?:sl|stop\s*loss)[:\s]*?(?P<sl>[-+]?\d*[\,\.]?\d+).*?(?:tp1|tp\s*1|take\s*profit\s*1)[:=\s]*?(?P<tp1>[-+]?\d*[\,\.]?\d+)(?:.*?(?:tp2|tp\s*2|take\s*profit\s*2)[:=\s]*?(?P<tp2>[-+]?\d*[\,\.]?\d+))?(?:.*?(?:tp3|tp\s*3|take\s*profit\s*3)[:=\s]*?(?P<tp3>[-+]?\d*[\,\.]?\d+))?(?:.*?(?:tp4|tp\s*4|take\s*profit\s*4)[:=\s]*?(?P<tp4>[-+]?\d*[\,\.]?\d+))?', re.IGNORECASE | re.DOTALL)
SIG_RX_SYMBOL_BUYSELL = re.compile(r'(?P<symbol>[A-Za-z]{3,5}/?[A-Za-z]{3})\b.{0,40}?\b(?P<side_word>BUY|SELL|LONG|SHORT)\s*(?:NOW)?\b.*?(?:entry|entry\s*at|entry\s*price|ep|enter)[^\d]*?(?P<entry>[-+]?\d*[\,\.]?\d+).*?(?:sl|stop\s*loss)[:\s]*?(?P<sl>[-+]?\d*[\,\.]?\d+)(?:.*?(?:tp1|tp\s*1|take\s*profit\s*1)[:=\s]*?(?P<tp1>[-+]?\d*[\,\.]?\d+))(?:.*?(?:tp2|tp\s*2|take\s*profit\s*2)[:=\s]*?(?P<tp2>[-+]?\d*[\,\.]?\d+))?(?:.*?(?:tp3|tp\s*3|take\s*profit\s*3)[:=\s]*?(?P<tp3>[-+]?\d*[\,\.]?\d+))?(?:.*?(?:tp4|tp\s*4|take\s*profit\s*4)[:=\s]*?(?P<tp4>[-+]?\d*[\,\.]?\d+))?', re.IGNORECASE | re.DOTALL)
SIG_RX_SIMPLE = re.compile(r'(?P<side_word>BUY|SELL)\s+(?P<symbol>[A-Za-z]{3,5}/?[A-Za-z]{3})\s+(?P<entry>[-+]?\d*[\,\.]?\d+).*?(?:tp1|tp\s*1|take\s*profit\s*1)[:=\s]*?(?P<tp1>[-+]?\d*[\,\.]?\d+)(?:.*?(?:tp2|tp\s*2|take\s*profit\s*2)[:=\s]*?(?P<tp2>[-+]?\d*[\,\.]?\d+))?(?:.*?(?:tp3|tp\s*3|take\s*profit\s*3)[:=\s]*?(?P<tp3>[-+]?\d*[\,\.]?\d+))?(?:.*?(?:tp4|tp\s*4|take\s*profit\s*4)[:=\s]*?(?P<tp4>[-+]?\d*[\,\.]?\d+))?.*?(?:sl|stop\s*loss)[:\s]*?(?P<sl>[-+]?\d*[\,\.]?\d+)', re.IGNORECASE | re.DOTALL)
SIG_RX_SIMPLE_IMPLICIT = re.compile(r'(?P<side_word>BUY|SELL)\s+(?P<symbol>[A-Za-z]{3,5}/?[A-Za-z]{3})\s+(?P<entry>[-+]?\d*[\,\.]?\d+).*?(?:tp1|tp\s*1|take\s*profit\s*1)[:=\s]*?(?P<tp1>[-+]?\d*[\,\.]?\d+)', re.IGNORECASE | re.DOTALL)

EPS = 1e-9
def _normalize_symbol(sym: str) -> str: return sym.upper().replace(" ", "").replace("/", "")
def _num(s: str) -> float: return float(s.replace(",", ".").strip())

def _sanitize_levels(side: str, entry: float, sl: float, tps_in: List[Optional[float]]) -> Tuple[Optional[float], List[float], str]:
    note = ""
    sl_ok: Optional[float] = sl
    if side == "long":
        if not (sl < entry - EPS): sl_ok = None; note += "SL ignored (>= entry). "
    else:
        if not (sl > entry + EPS): sl_ok = None; note += "SL ignored (<= entry). "
    tps: List[float] = []
    for tp in tps_in:
        if tp is None: continue
        if side == "long" and tp >= entry - EPS: tps.append(tp)
        elif side == "short" and tp <= entry + EPS: tps.append(tp)
    if len(tps) < len([x for x in tps_in if x is not None]): note += "Invalid TPs dropped. "
    tps.sort(reverse=(side == "short"))
    return sl_ok, tps, note.strip()

def parse_signal_text(text: str) -> Optional[Dict[str, Any]]:
    if not text: return None
    cleaned = re.sub(r'[^\w\.\s:/=\-\+]+', ' ', text)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    d = side = sym = None
    m = SIG_RX_CLASSIC.search(cleaned)
    if m: d = m.groupdict(); side = d["side"].lower(); sym = _normalize_symbol(d["symbol"])
    else:
        m = SIG_RX_BUYSELL.search(cleaned)
        if m: d = m.groupdict(); side = "long" if d["side_word"].lower()=="buy" else "short"; sym = _normalize_symbol(d["symbol"])
        else:
            m = SIG_RX_SYMBOL_BUYSELL.search(cleaned)
            if m: d = m.groupdict(); side = "long" if d["side_word"].lower()=="buy" else "short"; sym = _normalize_symbol(d["symbol"])
            else:
                m = SIG_RX_SIMPLE.search(cleaned)
                if m: d = m.groupdict(); side = "long" if d["side_word"].lower()=="buy" else "short"; sym = _normalize_symbol(d["symbol"])
                else:
                    m = SIG_RX_SIMPLE_IMPLICIT.search(cleaned)
                    if not m: return None
                    d = m.groupdict(); side = "long" if d["side_word"].lower()=="buy" else "short"; sym = _normalize_symbol(d["symbol"])

    if not sym.strip(): return None
    try:
        entry=_num(d["entry"]); sl=_num(d["sl"])
        tp1=_num(d["tp1"]) if d.get("tp1") else None
        tp2=_num(d["tp2"]) if d.get("tp2") else None
        tp3=_num(d["tp3"]) if d.get("tp3") else None
        tp4=_num(d["tp4"]) if d.get("tp4") else None
    except Exception: return None

    sl_ok, tps_ok, note = _sanitize_levels(side, entry, sl, [tp1, tp2, tp3, tp4])
    return {"symbol": sym, "side": side, "entry": entry, "sl": sl_ok, "tp1": tps_ok[0] if len(tps_ok)>0 else None, "note": note}

def load_session_string() -> Optional[str]:
    try:
        with open(SESSION_STRING_PATH, "r") as f: return f.read().strip() or None
    except FileNotFoundError: return None

async def main():
    sess_str = load_session_string()
    if not sess_str:
        print("Error: session file not found.")
        return

    client = TelegramClient(StringSession(sess_str), API_ID, API_HASH)
    await client.connect()
    
    if not await client.is_user_authorized():
        print("Error: Client not authorized.")
        return

    print("Fetching last 24h history from all channels...")
    scan_limit_hours = 24
    cutoff_time = datetime.now(tz=timezone.utc) - timedelta(hours=scan_limit_hours)
    
    report_data = []

    for chat_id, config in CHANNELS_CONFIG.items():
        print(f"Scanning {config['alias']}...")
        try:
            async for msg in client.iter_messages(chat_id, limit=500):
                if msg.date < cutoff_time:
                    break
                
                is_signal = False
                parsed_data = parse_signal_text(msg.message)
                
                status = "NO_SIGNAL"
                details = ""
                
                if parsed_data:
                    is_signal = True
                    status = "PARSED_OK"
                    details = f"{parsed_data['side'].upper()} {parsed_data['symbol']} @ {parsed_data['entry']}"
                    if parsed_data['note']:
                        status = "PARSED_WITH_NOTE"
                        details += f" ({parsed_data['note']})"
                
                # Basic heuristics for "Missed"
                if not is_signal:
                    lower_msg = (msg.message or "").lower()
                    if "buy" in lower_msg or "sell" in lower_msg:
                        if "tp" in lower_msg or "sl" in lower_msg:
                            status = "POTENTIAL_MISS"
                            details = "Contains keywords but failed parse"

                report_data.append({
                    "timestamp": msg.date.isoformat(),
                    "channel": config['alias'],
                    "raw_text": (msg.message or "").replace("\n", " ")[:200], # Trucate for CSV
                    "status": status,
                    "details": details
                })
        except Exception as e:
            print(f"Failed to scan {chat_id}: {e}")

    await client.disconnect()

    filename = f"daily_report_{datetime.now().strftime('%Y-%m-%d')}.csv"
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["timestamp", "channel", "raw_text", "status", "details"])
        writer.writeheader()
        writer.writerows(report_data)
    
    print(f"Done! Report saved to {filename}")

if __name__ == "__main__":
    asyncio.run(main())
