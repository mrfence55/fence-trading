import re

# Proposed Fix: Split into two patterns
REGEX_SIDE_SYMBOL = re.compile(r'(?P<side>BUY|SELL)\s+(?P<symbol>[A-Z0-9/]+)', re.IGNORECASE)
REGEX_SYMBOL_SIDE = re.compile(r'(?P<symbol>[A-Z0-9/]+)\s+(?P<side>BUY|SELL)', re.IGNORECASE)

# Text from User Screenshot (TFXC)
tfxc_text = """SIGNAL ALERT

BUY XAUUSD 4154.3

🤑 TP1: 4155.8
🤑 TP2: 4157.3
🤑 TP3: 4161.3
🔴 SL: 4147.3 (700 pips)"""

print(f"Testing Text:\n---\n{tfxc_text}\n---\n")

# Try Pattern 1 (BUY XAUUSD)
match1 = REGEX_SIDE_SYMBOL.search(tfxc_text)
if match1:
    print("✅ MATCH 1 (Side Symbol) FOUND!")
    print(f"Detected: {match1.group('side')} {match1.group('symbol')}")
else:
    print("❌ MATCH 1 FAILED")

# Try Pattern 2 (XAUUSD BUY)
match2 = REGEX_SYMBOL_SIDE.search(tfxc_text)
if match2:
    print("⚠️ MATCH 2 (Symbol Side) FOUND!")
    print(f"Detected: {match2.group('side')} {match2.group('symbol')}")
    
    # Check if it matched "ALERT BUY"
    if match2.group('symbol').upper() == "ALERT":
        print("   -> This is the BAD match we want to avoid if Pattern 1 works.")
