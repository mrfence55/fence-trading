
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from scripts.telegramTP_checker_td_tp4_eco import parse_signal_text

# Text from the screenshot (approximate)
TEST_TEXT = """
SIGNAL ALERT BUY XAUUSD 5297.3 🤑
TP1: 5300.3 🤑 TP2: 5304.8 🤑 TP3: 5315.3
"""

def test():
    print("Testing Signal Parsing for Gold Complex...")
    print(f"Input Text:\n{TEST_TEXT}")
    
    result = parse_signal_text(TEST_TEXT)
    
    if result:
        print("\n✅ SUCCESS! Parsed:")
        print(result)
    else:
        print("\n❌ FAILED. No regex matched.")

if __name__ == "__main__":
    test()
