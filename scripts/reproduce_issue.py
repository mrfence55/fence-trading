import re

text = """
XAUUSD Buy
Enter 4223
SL 4212
TP1 4226
TP2 4229
TP3 4235
TP4 4245

SL entry at TP1
"""

# Copying regexes from the main file
SIG_RX_CLASSIC = re.compile(
    r'(?P<symbol>[A-Za-z]{3,5}/?[A-Za-z]{3})\s+'
    r'(?P<side>LONG|SHORT)\b.*?'
    r'(?:entry|entry\s*price|ep|enter|entry\s*at)[:\s]*?(?P<entry>[-+]?\d*[\,\.]?\d+)'
    r'.*?(?:sl|stop\s*loss)[:\s]*?(?P<sl>[-+]?\d*[\,\.]?\d+)'
    r'.*?(?:tp1|tp\s*1|take\s*profit\s*1)[:=\s]*?(?P<tp1>[-+]?\d*[\,\.]?\d+)',
    re.IGNORECASE | re.DOTALL
)

SIG_RX_SYMBOL_BUYSELL = re.compile(
    r'(?P<symbol>[A-Za-z]{3,5}/?[A-Za-z]{3})\b'
    r'.{0,40}?\b(?P<side_word>BUY|SELL|LONG|SHORT)\s*(?:NOW)?\b'
    r'.*?(?:entry|entry\s*at|entry\s*price|ep|enter)[^\d]*?(?P<entry>[-+]?\d*[\,\.]?\d+)'
    r'.*?(?:sl|stop\s*loss)[:\s]*?(?P<sl>[-+]?\d*[\,\.]?\d+)'
    r'(?:.*?(?:tp1|tp\s*1|take\s*profit\s*1)[:=\s]*?(?P<tp1>[-+]?\d*[\,\.]?\d+))',
    re.IGNORECASE | re.DOTALL
)

def test():
    cleaned = re.sub(r'[^\w\.\s:/=\-\+]+', ' ', text)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    print(f"Cleaned text: '{cleaned}'")

    # Debug Symbol Match
    sym_rx = re.compile(r'(?P<symbol>[A-Za-z]{3,5}/?[A-Za-z]{3})\b')
    m_sym = sym_rx.search(cleaned)
    print(f"Symbol Match: {m_sym.groupdict() if m_sym else 'None'}")

    # Debug Side Match
    side_rx = re.compile(r'\b(?P<side_word>BUY|SELL|LONG|SHORT)\b', re.IGNORECASE)
    m_side = side_rx.search(cleaned)
    print(f"Side Match: {m_side.groupdict() if m_side else 'None'}")

    m2 = SIG_RX_SYMBOL_BUYSELL.search(cleaned)
    if m2:
        print("MATCHED SYMBOL_BUYSELL:", m2.groupdict())
    else:
        print("FAILED SYMBOL_BUYSELL")

test()
