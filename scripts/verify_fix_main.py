import sys
import os

# Add parent directory to path to allow importing from scripts
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from scripts.telegramTP_checker_td_tp4_eco import parse_signal_text
except ImportError as e:
    print(f"Import failed: {e}")
    # Mocking dependencies if needed, but let's try direct import first
    sys.exit(1)

signal_text = """
SIGNAL ALERT

BUY AUDUSD 0.65330

🤑 TP1 0.65380
🤑 TP2 0.65430
🤑 TP3 0.65480
🛑 SL 0.64580 (14 pips)
"""

print("--- Verifying Main Script Fix ---")
result = parse_signal_text(signal_text)
print("Result:", result)

if result and result['symbol'] == 'AUDUSD' and result['tp1'] == 0.65380:
    print("✅ SUCCESS: Signal parsed correctly!")
else:
    print("❌ FAILURE: Signal NOT parsed.")
