import re

# Current Regex from tekstFraChat.py
REGEX_ENTRY = re.compile(r'(?P<side>BUY|SELL)\s+(?P<symbol>[A-Z0-9/]+)|(?P<symbol2>[A-Z0-9/]+)\s+(?P<side2>BUY|SELL)', re.IGNORECASE)

# Text from User Screenshot (TFXC)
tfxc_text = """SIGNAL ALERT

BUY XAUUSD 4154.3

🤑 TP1: 4155.8
🤑 TP2: 4157.3
🤑 TP3: 4161.3
🔴 SL: 4147.3 (700 pips)"""

print(f"Testing Text:\n---\n{tfxc_text}\n---\n")

match = REGEX_ENTRY.search(tfxc_text)
if match:
    print("✅ MATCH FOUND!")
    print(f"Groups: {match.groupdict()}")
    side = (match.group("side") or match.group("side2")).upper()
    symbol = (match.group("symbol") or match.group("symbol2")).upper()
    print(f"Detected: {side} {symbol}")
else:
    print("❌ NO MATCH FOUND")
