import re

# Current Regexes from tekstFraChat.py
REGEX_SIDE_SYMBOL = re.compile(r'(?P<side>BUY|SELL)\s+(?P<symbol>[A-Z0-9/]+)', re.IGNORECASE)
REGEX_SYMBOL_SIDE = re.compile(r'(?P<symbol>[A-Z0-9/]+)\s+(?P<side>BUY|SELL)', re.IGNORECASE)

# Aurora Signal Text (reconstructed from previous screenshots)
aurora_text = """🏆 Aurora (Gold) PREMIUM 🏆
________________________
🟨 ALERT
Action: BUY NOW
________________________
🎯 TP1: 4155.7
🎯 TP2: 4158.7
🎯 TP3: 4165.7
🛑 SL: 4143.7
________________________
🧠 Analyst Note:
_Following the institutional flow._
#XAUUSD #GOLD"""

print(f"Testing Aurora Text:\n---\n{aurora_text}\n---\n")

# Logic from handler
entry_match = REGEX_SIDE_SYMBOL.search(aurora_text)
if not entry_match:
    print("❌ Side Symbol match failed, trying Symbol Side...")
    entry_match = REGEX_SYMBOL_SIDE.search(aurora_text)

if entry_match:
    print("✅ MATCH FOUND!")
    side = entry_match.group("side").upper()
    symbol = entry_match.group("symbol").upper()
    print(f"Raw Match: {side} {symbol}")
    
    if symbol in ["ALERT", "SIGNAL", "NOW"]:
        print(f"⚠️ Generic Symbol '{symbol}' detected. Looking for hashtag...")
        hashtag_match = re.search(r'#([A-Z0-9]+)', aurora_text)
        if hashtag_match:
            symbol = hashtag_match.group(1).upper()
            print(f"✅ Resolved Symbol from Hashtag: {symbol}")
        else:
            print("❌ Could not find hashtag!")
    
    print(f"Final Result: {side} {symbol}")
else:
    print("❌ NO MATCH AT ALL")
