
import re

# The text from the user's screenshot
SIGNAL_TEXT = """
SIGNAL ALERT

BUY XAUUSD 4315.7

🤑TP1: 4317.7
🤑TP2: 4320.7
🤑TP3: 4327.7
🛑SL: 4305.7 (1000 pips)
"""

# Existing regexes from telegramTP_checker_td_tp4_eco.py
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

print("-" * 50)
print("Testing Regex Matches...")
print("-" * 50)

cleaned = SIGNAL_TEXT.strip() # The bot does minimal cleaning

match_found = False

for name, rx in [
    ("CLASSIC", SIG_RX_CLASSIC),
    ("BUYSELL", SIG_RX_BUYSELL),
    ("SYMBOL_BUYSELL", SIG_RX_SYMBOL_BUYSELL),
    ("SIMPLE", SIG_RX_SIMPLE)
]:
    m = rx.search(cleaned)
    if m:
        print(f"✅ MATCHED with {name}!")
        print(m.groupdict())
        match_found = True
        break
    else:
        print(f"❌ Failed {name}")

if not match_found:
    print("\n🚨 NO MATCH FOUND! We need a new regex.")
