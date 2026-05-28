import re

# Copying regexes from telegramTP_checker_td_tp4_eco.py
SIG_RX_CLASSIC = re.compile(
    r'(?P<symbol>[A-Za-z]{3,5}/?[A-Za-z]{3})\s+'
    r'(?P<side>LONG|SHORT)\b.*?'
    r'(?:entry|entry\s*price|ep|enter|entry\s*at)[:\s]*?(?P<entry>[-+]?\d*[\,\.]?\d+)'
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
    r'.*?(?:entry|entry\s*at|entry\s*price|ep|enter)[:\s]*?(?P<entry>[-+]?\d*[\,\.]?\d+)'
    r'.*?(?:sl|stop\s*loss)[:\s]*?(?P<sl>[-+]?\d*[\,\.]?\d+)'
    r'.*?(?:tp1|tp\s*1|take\s*profit\s*1)[:=\s]*?(?P<tp1>[-+]?\d*[\,\.]?\d+)'
    r'(?:.*?(?:tp2|tp\s*2|take\s*profit\s*2)[:=\s]*?(?P<tp2>[-+]?\d*[\,\.]?\d+))?'
    r'(?:.*?(?:tp3|tp\s*3|take\s*profit\s*3)[:=\s]*?(?P<tp3>[-+]?\d*[\,\.]?\d+))?'
    r'(?:.*?(?:tp4|tp\s*4|take\s*profit\s*4)[:=\s]*?(?P<tp4>[-+]?\d*[\,\.]?\d+))?',
    re.IGNORECASE | re.DOTALL
)
SIG_RX_SYMBOL_BUYSELL = re.compile(
    r'(?P<symbol>[A-Za-z]{3,5}/?[A-Za-z]{3})\b'
    r'.{0,40}?\b(?P<side_word>BUY|SELL)\s*(?:NOW)?\b'
    r'.*?(?:entry|entry\s*at|entry\s*price|ep|enter)[:\s]*?(?P<entry>[-+]?\d*[\,\.]?\d+)'
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

def _normalize_symbol(sym: str) -> str:
    return sym.upper().replace(" ", "").replace("/", "")

def parse_signal_text(text: str):
    if not text: return None
    cleaned = re.sub(r'[^\w\.\s:/=\-\+]+', ' ', text)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    print(f"Cleaned text: '{cleaned}'")

    d = side = sym = None
    m = SIG_RX_CLASSIC.search(cleaned)
    if m:
        print("Matched CLASSIC")
        d = m.groupdict(); side = d["side"].lower(); sym = _normalize_symbol(d["symbol"])
    else:
        m = SIG_RX_BUYSELL.search(cleaned)
        if m:
            print("Matched BUYSELL")
            d = m.groupdict(); side = "long" if d["side_word"].lower()=="buy" else "short"; sym = _normalize_symbol(d["symbol"])
        else:
            m = SIG_RX_SYMBOL_BUYSELL.search(cleaned)
            if m:
                print("Matched SYMBOL_BUYSELL")
                d = m.groupdict(); side = "long" if d["side_word"].lower()=="buy" else "short"; sym = _normalize_symbol(d["symbol"])
            else:
                m = SIG_RX_SIMPLE.search(cleaned)
                if m:
                    print("Matched SIMPLE")
                    d = m.groupdict(); side = "long" if d["side_word"].lower()=="buy" else "short"; sym = _normalize_symbol(d["symbol"])
                else:
                    print("NO MATCH FOUND")
                    return None

    return d

# The signal text from the image
signal_text_1 = """
SIGNAL ALERT

BUY XAUUSD 4246.5

🤑 TP1: 4248.5
🤑 TP2: 4251.5
🤑 TP3: 4258.5
🔴 SL: 4236.5 (1000 pips)
"""

signal_text_2 = """
SIGNAL ALERT

BUY XAUUSD 4247.1

🤑 TP1: 4248.6
🤑 TP2: 4250.1
🤑 TP3: 4255.1
🔴 SL: 4239.1 (800 pips)
"""

print("--- Testing Signal 1 (Aurora) ---")
result1 = parse_signal_text(signal_text_1)
print("Result 1:", result1)

print("\n--- Testing Signal 2 (Odin) ---")
result2 = parse_signal_text(signal_text_2)
print("Result 2:", result2)
