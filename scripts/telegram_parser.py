import re
import json

def parse_signal(message):
    """
    Parses a trading signal message from Telegram.
    
    Format Example:
    📉SELL XAUUSD
    ✅Entry price 4039.8
    🔴 SL : 4054.8
    🔵 TP1 : 4036.8
    🔵 TP2 : 4032.3
    🔵 TP3 : 4021.8
    """
    data = {}
    
    # Extract Type and Pair (e.g., SELL XAUUSD)
    type_match = re.search(r"(BUY|SELL)\s+([A-Z0-9]+)", message, re.IGNORECASE)
    if type_match:
        data["type"] = type_match.group(1).upper()
        data["pair"] = type_match.group(2).upper()
    
    # Extract Entry Price
    entry_match = re.search(r"Entry price\s+([\d\.]+)", message)
    if entry_match:
        data["entry"] = float(entry_match.group(1))
        
    # Extract SL
    sl_match = re.search(r"SL\s*:\s*([\d\.]+)", message)
    if sl_match:
        data["sl"] = float(sl_match.group(1))
        
    # Extract TPs
    tps = []
    tp_matches = re.findall(r"TP(\d+)\s*:\s*([\d\.]+)", message)
    for num, price in tp_matches:
        tps.append({"level": int(num), "price": float(price)})
    
    data["tps"] = tps
    
    return data

# Example Usage
if __name__ == "__main__":
    sample_message = """
    📉SELL XAUUSD
    ✅Entry price 4039.8
    🔴 SL : 4054.8
    🔵 TP1 : 4036.8
    🔵 TP2 : 4032.3
    🔵 TP3 : 4021.8
    """
    
    result = parse_signal(sample_message)
    print(json.dumps(result, indent=2))
