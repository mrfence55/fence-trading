
import re

# NEW Improved Regex
SIG_RX_CRYPTO_FLEXIBLE = re.compile(
    r'(?P<symbol>[A-Za-z]{3,5}/?[A-Za-z]{3})\b'
    r'.{0,20}?' # Allow up to 20 chars between symbol and side (e.g. " Scalp ", " Swing ", " ")
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
    
    m = SIG_RX_CRYPTO_FLEXIBLE.search(cleaned)
    if m:
        return m.groupdict()
    return None

# TEST DATA from Dump
signal_text = """HALF SIZE 

BTCUSD Scalp Long 

Entry (buy limit): 92243
SL: 91600
TP1: 92530
TP2: 92868
TP3: 93258
TP4: 93501"""

print("--- Testing Flexible Regex ---")
parsed = parse_signal_text(signal_text)
if parsed:
    print("SUCCESS: Parsed Signal")
    print(parsed)
else:
    print("FAILURE: Could not parse signal")
