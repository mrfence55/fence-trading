import asyncio
import os
import re
from telethon import TelegramClient, events
from telethon.sessions import StringSession

# Config
API_ID   = 27308955
API_HASH = "12c8d6da1b61b738ba1d28b892452783"
SESSION_STRING_PATH = "tg_session.txt"

# Regex (Copied from main bot)
SIG_RX_CLASSIC = re.compile(
    r'(?P<symbol>[A-Za-z]{3,5}/?[A-Za-z]{3})\s+'
    r'(?P<side>LONG|SHORT)\b.*?'
    r'(?:entry|entry\s*price|ep|enter|entry\s*at)[^\d]*?(?P<entry>[-+]?\d*[\,\.]?\d+)'
    r'.*?(?:sl|stop\s*loss)[:\s]*?(?P<sl>[-+]?\d*[\,\.]?\d+)'
    r'.*?(?:tp1|tp\s*1|take\s*profit\s*1)[:=\s]*?(?P<tp1>[-+]?\d*[\,\.]?\d+)'
    r'(?:.*?(?:tp2|tp\s*2|take\s*profit\s*2)[:=\s]*?(?P<tp2>[-+]?\d*[\,\.]?\d+))?'
    r'(?:.*?(?:tp3|tp\s*3|take\s*profit\s*3)[:=\s]*?(?P<tp3>[-+]?\d*[\,\.]?\d+))?'
    r'(?:.*?(?:tp4|tp\s*4|take\s*profit\s*4)[:=\s]*?(?P<tp4>[-+]?\d*[\,\.]?\d+))?',
    re.IGNORECASE | re.DOTALL
)
SIG_RX_BUYSELL = re.compile(
    r'(?P<side_word>BUY|SELL)\s+'
    r'(?P<symbol>[A-Za-z]{3,5}/?[A-Za-z]{3})'
    r'.*?(?:entry|entry\s*at|entry\s*price|ep|enter)[^\d]*?(?P<entry>[-+]?\d*[\,\.]?\d+)'
    r'.*?(?:sl|stop\s*loss)[:\s]*?(?P<sl>[-+]?\d*[\,\.]?\d+)'
    r'.*?(?:tp1|tp\s*1|take\s*profit\s*1)[:=\s]*?(?P<tp1>[-+]?\d*[\,\.]?\d+)'
    r'(?:.*?(?:tp2|tp\s*2|take\s*profit\s*2)[:=\s]*?(?P<tp2>[-+]?\d*[\,\.]?\d+))?'
    r'(?:.*?(?:tp3|tp\s*3|take\s*profit\s*3)[:=\s]*?(?P<tp3>[-+]?\d*[\,\.]?\d+))?'
    r'(?:.*?(?:tp4|tp\s*4|take\s*profit\s*4)[:=\s]*?(?P<tp4>[-+]?\d*[\,\.]?\d+))?',
    re.IGNORECASE | re.DOTALL
)
SIG_RX_SYMBOL_BUYSELL = re.compile(
    r'(?P<symbol>[A-Za-z]{3,5}/?[A-Za-z]{3})\b'
    r'.{0,40}?\b(?P<side_word>BUY|SELL|LONG|SHORT)\s*(?:NOW)?\b'
    r'.*?(?:entry|entry\s*at|entry\s*price|ep|enter)[^\d]*?(?P<entry>[-+]?\d*[\,\.]?\d+)'
    r'.*?(?:sl|stop\s*loss)[:\s]*?(?P<sl>[-+]?\d*[\,\.]?\d+)'
    r'(?:.*?(?:tp1|tp\s*1|take\s*profit\s*1)[:=\s]*?(?P<tp1>[-+]?\d*[\,\.]?\d+))'
    r'(?:.*?(?:tp2|tp\s*2|take\s*profit\s*2)[:=\s]*?(?P<tp2>[-+]?\d*[\,\.]?\d+))?'
    r'(?:.*?(?:tp3|tp\s*3|take\s*profit\s*3)[:=\s]*?(?P<tp3>[-+]?\d*[\,\.]?\d+))?'
    r'(?:.*?(?:tp4|tp\s*4|take\s*profit\s*4)[:=\s]*?(?P<tp4>[-+]?\d*[\,\.]?\d+))?',
    re.IGNORECASE | re.DOTALL
)
SIG_RX_SIMPLE = re.compile(
    r'(?P<side_word>BUY|SELL)\s+'
    r'(?P<symbol>[A-Za-z]{3,5}/?[A-Za-z]{3})\s+'
    r'(?P<entry>[-+]?\d*[\,\.]?\d+)'
    r'.*?(?:tp1|tp\s*1|take\s*profit\s*1)[:=\s]*?(?P<tp1>[-+]?\d*[\,\.]?\d+)'
    r'(?:.*?(?:tp2|tp\s*2|take\s*profit\s*2)[:=\s]*?(?P<tp2>[-+]?\d*[\,\.]?\d+))?'
    r'(?:.*?(?:tp3|tp\s*3|take\s*profit\s*3)[:=\s]*?(?P<tp3>[-+]?\d*[\,\.]?\d+))?'
    r'(?:.*?(?:tp4|tp\s*4|take\s*profit\s*4)[:=\s]*?(?P<tp4>[-+]?\d*[\,\.]?\d+))?'
    r'.*?(?:sl|stop\s*loss)[:\s]*?(?P<sl>[-+]?\d*[\,\.]?\d+)',
    re.IGNORECASE | re.DOTALL
)
SIG_RX_SIMPLE_IMPLICIT = re.compile(
    r'(?P<side_word>BUY|SELL)\s+'
    r'(?P<symbol>[A-Za-z]{3,5}/?[A-Za-z]{3})\s+'
    r'(?P<entry>[-+]?\d*[\,\.]?\d+)'
    r'.*?(?:tp1|tp\s*1|take\s*profit\s*1)[:=\s]*?(?P<tp1>[-+]?\d*[\,\.]?\d+)',
    re.IGNORECASE | re.DOTALL
)

def _normalize_symbol(sym: str) -> str:
    return sym.upper().replace(" ", "").replace("/", "")

def _num(s: str) -> float:
    return float(s.replace(",", ".").strip())

def parse_signal_text(text: str):
    if not text: return None
    cleaned = re.sub(r'[^\w\.\s:/=\-\+]+', ' ', text)
    cleaned = re.sub(r'\s+', ' ', cleaned)

    d = side = sym = None
    m = SIG_RX_CLASSIC.search(cleaned)
    if m:
        d = m.groupdict(); side = d["side"].lower(); sym = _normalize_symbol(d["symbol"])
    else:
        m = SIG_RX_BUYSELL.search(cleaned)
        if m:
            d = m.groupdict(); side = "long" if d["side_word"].lower()=="buy" else "short"; sym = _normalize_symbol(d["symbol"])
        else:
            m = SIG_RX_SYMBOL_BUYSELL.search(cleaned)
            if m:
                d = m.groupdict(); side = "long" if d["side_word"].lower()=="buy" else "short"; sym = _normalize_symbol(d["symbol"])
            else:
                m = SIG_RX_SIMPLE.search(cleaned)
                if m:
                    d = m.groupdict(); side = "long" if d["side_word"].lower()=="buy" else "short"; sym = _normalize_symbol(d["symbol"])
                else:
                    m = SIG_RX_SIMPLE_IMPLICIT.search(cleaned)
                    if not m: return None
                    d = m.groupdict(); side = "long" if d["side_word"].lower()=="buy" else "short"; sym = _normalize_symbol(d["symbol"])

    if not sym or not sym.strip(): return None
    try:
        entry=_num(d["entry"]); sl=_num(d["sl"]); tp1=_num(d["tp1"])
    except Exception:
        return None

    return {
        "symbol": sym,
        "side": side,
        "entry": entry,
        "sl": sl,
        "tp1": tp1
    }

async def main():
    print("🚀 Starting Debug Signal Listener...")
    
    # Check session in multiple locations
    possible_paths = [
        "tg_session.txt",
        "scripts/tg_session.txt",
        "../tg_session.txt",
        os.path.join(os.path.dirname(__file__), "tg_session.txt")
    ]
    
    session_str = None
    found_path = None
    
    for path in possible_paths:
        if os.path.exists(path):
            found_path = path
            print(f"✅ Found session file at: {path}")
            with open(path, "r") as f:
                session_str = f.read().strip()
            break
            
    if not session_str:
        print(f"⚠️ Session file not found. Starting interactive login...")
        # Create a new session file
        client = TelegramClient("debug_session", API_ID, API_HASH)
        await client.start()
        print("✅ Logged in! Saving session for next time...")
    else:
        client = TelegramClient(StringSession(session_str), API_ID, API_HASH)
    
    @client.on(events.NewMessage())
    async def handler(evt):
        msg = evt.message
        
        # SANITIZED PRINTING (Fixes UnicodeEncodeError)
        chat_title = msg.chat.title if hasattr(msg.chat, 'title') else 'Unknown'
        safe_msg = msg.message[:50].encode('ascii', 'replace').decode('ascii').replace('\n', ' ')
        safe_title = chat_title.encode('ascii', 'replace').decode('ascii')
        
        print(f"📩 [{msg.chat_id}] {safe_title}: {safe_msg}...")
        
        # Try Parsing
        parsed = parse_signal_text(msg.message)
        if parsed:
            print(f"   ✅ SIGNAL DETECTED: {parsed['symbol']} {parsed['side'].upper()} @ {parsed['entry']}")
        else:
            print(f"   ❌ Not a signal")

    print("✅ Connected! Waiting for messages... (Press Ctrl+C to stop)")
    await client.start()
    await client.run_until_disconnected()

if __name__ == "__main__":
    asyncio.run(main())
