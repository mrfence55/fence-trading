
import re

# Regex Definitions from telegramTP_checker_td_tp4_eco.py

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

def _normalize_symbol(sym):
    return sym.upper().replace(" ", "").replace("/", "")

def parse_signal_text(text):
    if not text: return None
    cleaned = re.sub(r'[^\w\.\s:/=\-\+]+', ' ', text)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    print(f"Cleaned Text: '{cleaned}'")

    d = None
    m = SIG_RX_CLASSIC.search(cleaned)
    if m:
        print("MATCH: CLASSIC")
        d = m.groupdict()
    else:
        m = SIG_RX_SYMBOL_BUYSELL.search(cleaned)
        if m:
            print("MATCH: SYMBOL_BUYSELL")
            d = m.groupdict()
    
    if d:
        print("Captured:", d)
    else:
        print("NO MATCH")
    return d

# TEST CASE: Fred Trading EurUSD
text = """EurUSD Buy Now
Enter 1.16000
SL 1.15000 (100)
TP1 1.16300
TP2 1.6750
TP3 1.17250
TP4 1.18000

Swing
8-10 weeks"""

parse_signal_text(text)
