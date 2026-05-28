
import re

# The text from the screenshot
# "SIGNAL ALERT"
# (newline)
# "BUY XAUUSD 4339.3"
# (emojis and TPs)

TFXC_TEXT = """SIGNAL ALERT

BUY XAUUSD 4339.3

🤑TP1: 4341.3
🤑TP2: 4344.3
🤑TP3: 4347.3
🛑SL: 4331.3 (800 pips)"""

GOLD_TEXT = """SIGNAL ALERT

BUY XAUUSD 4342.4

🤑TP1: 4344.4
🤑TP2: 4347.4
🤑TP3: 4353.4
🛑SL: 4331.4"""


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

def test(name, text):
    print(f"--- Testing {name} ---")
    cleaned = re.sub(r'[^\w\.\s:/=\-\+]+', ' ', text)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    print(f"Cleaned: '{cleaned}'")
    
    m = SIG_RX_SIMPLE.search(cleaned)
    if m:
        print("MATCH!")
        print(m.groupdict())
    else:
        print("NO MATCH")

if __name__ == "__main__":
    test("TFXC", TFXC_TEXT)
    test("GOLD", GOLD_TEXT)
