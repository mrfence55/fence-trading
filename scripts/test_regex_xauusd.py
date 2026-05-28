
import re

# Current Regex (Simulated)
REGEX_OLD = re.compile(r'(?P<symbol>[A-Za-z]{3,5}/?[A-Za-z]{3})')

# Proposed Fix: Allow 6 chars explicitly OR the split format
REGEX_NEW = re.compile(r'(?P<symbol>[A-Za-z]{6}\b|[A-Za-z]{3,5}/?[A-Za-z]{3})')

TEST_SYMBOLS = [
    "XAUUSD", # 6 chars (Fails on old)
    "EURUSD", # 6 chars
    "BTC/USD",
    "BTCUSD",
    "ETHUSD", 
    "US30",   # 4 chars (might fail regex anyway, usually caught by specific logic or fails standard 3+3)
    "GOLD"    # 4 chars
]

def test():
    print("=== Testing Regex Symbol Matching ===")
    
    for sym in TEST_SYMBOLS:
        print(f"\nTesting: '{sym}'")
        
        # OLD
        m_old = REGEX_OLD.match(sym)
        if m_old:
            print(f"  OLD: MATCH -> {m_old.group('symbol')}")
            if m_old.group('symbol') != sym:
                 print(f"       WARNING: Partial match '{m_old.group('symbol')}' != '{sym}'")
        else:
            print(f"  OLD: NO MATCH")
            
        # NEW
        m_new = REGEX_NEW.match(sym)
        if m_new:
            print(f"  NEW: MATCH -> {m_new.group('symbol')}")
        else:
            print(f"  NEW: NO MATCH")

if __name__ == "__main__":
    test()
