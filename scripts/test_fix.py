import re

# New proposed regex V2 (TPs before SL)
SIG_RX_SIMPLE_V2 = re.compile(
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

def _normalize_symbol(sym: str) -> str:
    return sym.upper().replace(" ", "").replace("/", "")

def parse_signal_text(text: str):
    if not text: return None
    cleaned = re.sub(r'[^\w\.\s:/=\-\+]+', ' ', text)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    print(f"Cleaned text: '{cleaned}'")

    d = side = sym = None
    m = SIG_RX_SIMPLE_V2.search(cleaned)
    if m:
        print("Matched SIMPLE_V2")
        d = m.groupdict(); side = "long" if d["side_word"].lower()=="buy" else "short"; sym = _normalize_symbol(d["symbol"])
    else:
        print("NO MATCH FOUND")
        return None

    return d

# The signal text from the image
signal_text = """
SIGNAL ALERT

BUY AUDUSD 0.65330

🤑 TP1 0.65380
🤑 TP2 0.65430
🤑 TP3 0.65480
🛑 SL 0.64580 (14 pips)
"""

print("--- Testing Fix V2 ---")
result = parse_signal_text(signal_text)
print("Result:", result)
