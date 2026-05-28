
import re
from datetime import datetime

# --- MOCKING LOGIC ---

def _normalize_symbol(sym):
    return sym.upper().replace(" ", "").replace("/", "")

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

def parse_signal_text(text):
    if not text: return None
    cleaned = re.sub(r'[^\w\.\s:/=\-\+]+', ' ', text)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    print(f"Cleaned Signal: '{cleaned}'")
    m = SIG_RX_CLASSIC.search(cleaned)
    if m:
        return m.groupdict()
    return None

def handle_reply_text(text):
    text = text.lower()
    print(f"Reply Text (Lower): '{text}'")
    
    new_hits = None
    if "tp1" in text or "tp 1" in text: new_hits = 1
    elif "tp2" in text or "tp 2" in text: new_hits = 2
    elif "tp3" in text or "tp 3" in text: new_hits = 3
    elif "tp4" in text or "tp 4" in text: new_hits = 4
    
    return new_hits

# --- TEST DATA ---
signal_text = """HALF SIZE 

BTCUSD Scalp Long 

Entry (buy limit): 92243
SL: 91600
TP1: 92530
TP2: 92868
TP3: 93258
TP4: 93501"""

reply_text = """TP4 Hit 

1.5% / 2.12R"""

print("--- 1. Testing Original Signal Parsing ---")
parsed = parse_signal_text(signal_text)
if parsed:
    print("SUCCESS: Parsed Signal")
    print(parsed)
else:
    print("FAILURE: Could not parse signal")

print("\n--- 2. Testing Reply Parsing ---")
hits = handle_reply_text(reply_text)
if hits == 4:
    print("SUCCESS: Detected TP4 Hit")
else:
    print(f"FAILURE: Detected hits={hits}, expected 4")

