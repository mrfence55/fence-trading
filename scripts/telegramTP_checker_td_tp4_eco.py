# telegramTP_checker_td_tp4_eco.py
# Twelve Data TP/SL watcher – economy mode + dedup + warm-start + SL double-check

import re, time, asyncio, urllib.parse, sqlite3
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple

import aiosqlite
import aiohttp
from telethon import TelegramClient, events
from telethon.tl.types import Message
from telethon.sessions import StringSession

# ===== In-memory de-dup =====
ANNOUNCED_LAST_HIT: dict[int, int] = {}   # record_id -> last TP number (0..4)
ANNOUNCED_LAST_TS: dict[int, int]  = {}   # record_id -> last epoch-sec we messaged
ANNOUNCE_COOLDOWN_SEC = 20

# =============== CONFIG ===============
API_ID   = 27308955
API_HASH = "12c8d6da1b61b738ba1d28b892452783"

# Source Channels and their Targets
CHANNELS_CONFIG = {
    -1002154812244: {"alias": "Aurora (Gold)",   "target_id": -1003369420967, "type": "GOLD"},  # The Gold Complex
    -1001220837618: {"alias": "Odin",            "target_id": -1003396317717, "type": "FOREX"},  # TFXC PREMIUM
    -1001239815745: {"alias": "Fence Trading",   "target_id": -1003330700210, "type": "FOREX"},  # Fredtrading -> Fence Trading
    -1002208969496: {"alias": "Fence Crypto",    "target_id": -1003368566412, "type": "CRYPTO"},
    -1001979286278: {"alias": "Fence Live",      "target_id": -1003437413343, "type": "INDICES"},
    -1002309276824: {"alias": "Fence Free (Test)", "target_id": -1002083880162, "type": "FOREX"} # Test Channel -> Fence Trading
}
TARGET_CHAT_IDS = list(CHANNELS_CONFIG.keys())

# ================= SMART REWRITER & ASSETS =================
ASSET_STYLES = {
    "GOLD":    {"emoji": "🏆", "color": "🟨", "tag": "#XAUUSD #GOLD"},
    "CRYPTO":  {"emoji": "🚀", "color": "🟦", "tag": "#CRYPTO #BITCOIN"},
    "FOREX":   {"emoji": "💱", "color": "🟩", "tag": "#FOREX #FX"},
    "INDICES": {"emoji": "📈", "color": "🟧", "tag": "#INDICES #US30"},
    "UNKNOWN": {"emoji": "⚡", "color": "⬜", "tag": "#TRADING"}
}



SMART_PHRASES = {
    "breakout": ["Price is breaking key structure.", "Momentum is building for a breakout.", "Volatility incoming."],
    "retest":   ["Waiting for the retest of the zone.", "Classic break and retest setup.", "Patience for the pullback."],
    "scalp":    ["Quick scalp opportunity.", "In and out quickly.", "High frequency setup."],
    "swing":    ["Holding this for the bigger move.", "Swing trade setup.", "Targeting higher timeframe levels."],
    "risk":     ["Manage your risk strictly.", "Don't overleverage.", "Protect your capital."],
    "news":     ["High impact news ahead.", "Trade with caution due to news.", "Market volatility expected."]
}

import random

def get_smart_commentary(text):
    """Analyzes text and returns a professional insight."""
    text_lower = text.lower()
    comments = []
    
    for key, phrases in SMART_PHRASES.items():
        if key in text_lower:
            comments.append(random.choice(phrases))
            
    if not comments:
        # Default professional fillers if no keywords found
        defaults = [
            "Market structure looks prime for this move.",
            "Setup confirmed by algorithm.",
            "Following the institutional flow.",
            "Key liquidity levels identified."
        ]
        return random.choice(defaults)
        
    return " ".join(comments[:2])

TD_KEY   = "e319e4cc7cec44ad975841ded108a985"
CHECK_EVERY_SECONDS_BASE = 120            # base polling interval
FAST_CHECK_ENABLED = False                # keep off to save credits

SESSION_STRING_PATH = "tg_session.txt"
DB_PATH = "signals.db"

MAX_SIGNAL_AGE_DAYS = 5
WARM_START_SKIP_BACKFILL = True

# Website API Config
WEBSITE_API_URL = "http://localhost:3000/api/signals" # Localhost on VPS
# =====================================

# Touch buffers (reduce false positives on wicks)
TOUCH_BUFFER = {
    "FX": 0.0002,
    "XAUUSD": 0.5,     # ↑ was 0.2 — tighten gold confirmations
    "XAGUSD": 0.02,
    "DEFAULT": 0.0002,
}
def _buf_for(sym: str) -> float:
    s = sym.upper().replace(" ", "")
    if s in ("XAUUSD", "XAU/USD"): return TOUCH_BUFFER["XAUUSD"]
    if s in ("XAGUSD", "XAG/USD"): return TOUCH_BUFFER["XAGUSD"]
    return TOUCH_BUFFER["FX"] if (len(s) >= 6 and s[-3:].isalpha()) else TOUCH_BUFFER["DEFAULT"]

EPS = 1e-9

# ---------- Helpers ----------
def ceil_to_next_minute_utc(ts_sec: int) -> int:
    return ((ts_sec // 60) + 1) * 60

def _normalize_symbol(sym: str) -> str:
    return sym.upper().replace(" ", "").replace("/", "")

def _num(s: str) -> float:
    return float(s.replace(",", ".").strip())

# ---------- Parser ----------
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
SIG_RX_SIMPLE_IMPLICIT = re.compile(
    r'(?P<side_word>BUY|SELL)\s+'
    r'(?P<symbol>[A-Za-z]{3,5}/?[A-Za-z]{3})\s+'
    r'(?P<entry>[-+]?\d*[\,\.]?\d+)'
    r'.*?(?:tp1|tp\s*1|take\s*profit\s*1)[:=\s]*?(?P<tp1>[-+]?\d*[\,\.]?\d+)',
    re.IGNORECASE | re.DOTALL
)

def _sanitize_levels(side: str, entry: float, sl: float, tps_in: List[Optional[float]]) -> Tuple[Optional[float], List[float], str]:
    note = ""
    sl_ok: Optional[float] = sl
    if side == "long":
        if not (sl < entry - EPS):
            sl_ok = None; note += "SL ignorert (ikke under entry for LONG). "
    else:
        if not (sl > entry + EPS):
            sl_ok = None; note += "SL ignorert (ikke over entry for SHORT). "

    tps: List[float] = []
    for tp in tps_in:
        if tp is None: continue
        if side == "long" and tp >= entry - EPS: tps.append(tp)
        elif side == "short" and tp <= entry + EPS: tps.append(tp)
    if len(tps) < len([x for x in tps_in if x is not None]):
        note += "Ulogiske TP-er droppet. "

    tps.sort(reverse=(side == "short"))
    return sl_ok, tps, note.strip()

def parse_signal_text(text: str) -> Optional[Dict[str, Any]]:
    if not text: return None
    cleaned = re.sub(r'[^\w\.\s:/=\-\+]+', ' ', text)
    cleaned = re.sub(r'\s+', ' ', cleaned)

    d = side = sym = None
    m = SIG_RX_CLASSIC.search(cleaned)
    if m:
        d = m.groupdict(); side = d["side"].lower(); sym = _normalize_symbol(d["symbol"])
    else:
        m = SIG_RX_BUYSELL.search(cleaned)
        if m:
            d = m.groupdict()
            side = "long" if d["side_word"].lower()=="buy" else "short"
            sym = _normalize_symbol(d["symbol"])
        else:
            m = SIG_RX_SYMBOL_BUYSELL.search(cleaned)
            if m:
                d = m.groupdict()
                side = "long" if d["side_word"].lower()=="buy" else "short"
                sym = _normalize_symbol(d["symbol"])
            else:
                m = SIG_RX_SIMPLE.search(cleaned)
                if m:
                    d = m.groupdict()
                    side = "long" if d["side_word"].lower()=="buy" else "short"
                    sym = _normalize_symbol(d["symbol"])
                else:
                    m = SIG_RX_SIMPLE_IMPLICIT.search(cleaned)
                    if not m: return None
                    d = m.groupdict(); side = "long" if d["side_word"].lower()=="buy" else "short"; sym = _normalize_symbol(d["symbol"])

    if not sym.strip(): return None
    try:
        entry=_num(d["entry"]); sl=_num(d["sl"])
        tp1=_num(d["tp1"]) if d.get("tp1") else None
        tp2=_num(d["tp2"]) if d.get("tp2") else None
        tp3=_num(d["tp3"]) if d.get("tp3") else None
        tp4=_num(d["tp4"]) if d.get("tp4") else None
    except Exception:
        return None

    sl_ok, tps_ok, note = _sanitize_levels(side, entry, sl, [tp1, tp2, tp3, tp4])
    rec = {
        "symbol": sym,
        "side": side,
        "entry": entry,
        "sl": sl_ok if sl_ok is not None else None,
        "tp1": tps_ok[0] if len(tps_ok) > 0 else None,
        "tp2": tps_ok[1] if len(tps_ok) > 1 else None,
        "tp3": tps_ok[2] if len(tps_ok) > 2 else None,
        "tp4": tps_ok[3] if len(tps_ok) > 3 else None,
        "note": note
    }
    # Allow signals without TPs - they will be updated later
    return rec

# ---------- DB ----------
CREATE_SQL = """
CREATE TABLE IF NOT EXISTS signals(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  chat_title TEXT,
  msg_id INTEGER NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  entry REAL NOT NULL,
  sl REAL,
  tp1 REAL,
  tp2 REAL,
  tp3 REAL,
  tp4 REAL,
  hits INTEGER NOT NULL DEFAULT 0,
  notified_hits INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  close_reason TEXT,
  created_at INTEGER NOT NULL,
  anchor_ts INTEGER NOT NULL,
  last_check_ts INTEGER NOT NULL,
  target_chat_id INTEGER,
  target_msg_id INTEGER
);
CREATE INDEX IF NOT EXISTS idx_open ON signals(status);
CREATE INDEX IF NOT EXISTS idx_symbol ON signals(symbol);
CREATE INDEX IF NOT EXISTS idx_created ON signals(created_at);
"""

async def db_init():
    async with aiosqlite.connect(DB_PATH) as db:
        for stmt in CREATE_SQL.strip().split(";"):
            if stmt.strip(): await db.execute(stmt)
        try:
            await db.execute("ALTER TABLE signals ADD COLUMN notified_hits INTEGER NOT NULL DEFAULT 0;")
        except sqlite3.OperationalError:
            pass
        try:
            await db.execute("ALTER TABLE signals ADD COLUMN target_chat_id INTEGER;")
        except sqlite3.OperationalError:
            pass
        try:
            await db.execute("ALTER TABLE signals ADD COLUMN target_msg_id INTEGER;")
        except sqlite3.OperationalError:
            pass
        try:
            await db.execute("ALTER TABLE signals ADD COLUMN chat_title TEXT;")
        except sqlite3.OperationalError:
            pass
        await db.commit()

async def warm_start_open_signals():
    if not WARM_START_SKIP_BACKFILL: return
    now = datetime.now(tz=timezone.utc)
    cur_min_start = int(datetime(now.year, now.month, now.day, now.hour, now.minute, tzinfo=timezone.utc).timestamp())
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE signals SET last_check_ts=? WHERE status='open'", (cur_min_start,))
        await db.commit()

async def insert_signal(rec: Dict[str, Any]):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO signals(chat_id,chat_title,msg_id,symbol,side,entry,sl,tp1,tp2,tp3,tp4,hits,notified_hits,status,close_reason,created_at,anchor_ts,last_check_ts)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?, ?, ?, ?, ?, ?, ?)""",
            (rec["chat_id"], rec.get("chat_title"), rec["msg_id"], rec["symbol"], rec["side"], rec["entry"], rec["sl"],
             rec["tp1"], rec.get("tp2"), rec.get("tp3"), rec.get("tp4"),
             0, 0, "open", None, rec["created_at"], rec["anchor_ts"], rec["created_at"])
        )
        await db.commit()

async def get_open_signals_recent(max_age_days: int) -> List[Dict[str, Any]]:
    cutoff = int((datetime.now(tz=timezone.utc) - timedelta(days=max_age_days)).timestamp())
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("SELECT * FROM signals WHERE status='open' AND created_at>=? ORDER BY id ASC", (cutoff,))
        rows = await cur.fetchall()
        cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]

async def update_signal(rec_id: int, **updates):
    sets = ", ".join([f"{k}=?" for k in updates.keys()])
    vals = list(updates.values()) + [rec_id]
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE signals SET {sets} WHERE id=?", vals)
        await db.commit()

# ---------- Twelve Data ----------
def td_map_symbol(sym: str) -> str:
    s = sym.upper().replace(" ", "")
    if len(s) >= 6 and s[-3:] in ("USD","EUR","GBP","JPY","CHF","CAD","AUD","NZD","PLN","SEK","NOK"):
        return f"{s[:3]}/{s[3:]}"
    CRYPTO = {"BTC","ETH","SOL","ADA","DOGE","XRP","LTC","BNB","DOT","LINK","AVAX","MATIC"}
    if s.endswith("USD") and s[:-3] in CRYPTO:
        return f"{s[:-3]}/USD"
    if s == "XAUUSD": return "XAU/USD"
    if s == "XAGUSD": return "XAG/USD"
    return ""

async def td_time_series_1m(symbol: str, since_ms: int) -> List[List]:
    if not TD_KEY: return []
    sym = td_map_symbol(symbol)
    if not sym: return []
    sym_q = urllib.parse.quote(sym, safe="")
    start_iso = datetime.fromtimestamp(since_ms/1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    url = ("https://api.twelvedata.com/time_series"
           f"?symbol={sym_q}&interval=1min&start_date={start_iso}"
           f"&outputsize=1000&timezone=UTC&apikey={TD_KEY}")
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as s:
        async with s.get(url) as r:
            j = await r.json()
    if isinstance(j, dict) and j.get("status") == "error":
        msg = j.get("message", "")
        print(f"TD ERROR for {sym} at {start_iso}: {msg}")
        if "run out of api credits" in msg.lower():
            raise RuntimeError("TD_OUT_OF_CREDITS")
        return []
    values = j.get("values", []) if isinstance(j, dict) else []
    values.sort(key=lambda x: x["datetime"])
    out: List[List] = []
    for row in values:
        ts = int(datetime.strptime(row["datetime"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc).timestamp() * 1000)
        out.append([ts, float(row["open"]), float(row["high"]), float(row["low"]), float(row["close"]), float(row.get("volume", 0))])
    return out

async def td_price(symbol: str) -> Optional[float]:
    if not TD_KEY: return None
    sym = td_map_symbol(symbol)
    if not sym: return None
    sym_q = urllib.parse.quote(sym, safe="")
    url = f"https://api.twelvedata.com/price?symbol={sym_q}&apikey={TD_KEY}"
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=15)) as s:
        async with s.get(url) as r:
            j = await r.json()
    try:
        return float(j.get("price"))
    except Exception:
        return None

# ---------- Evaluator ----------
def _touch_map(side: str, sl: Optional[float], tp_list: List[Optional[float]], buf: float):
    tp1, tp2, tp3, tp4 = (tp_list + [None]*4)[:4]
    def long_map(h, l):
        return {
            "sl":  (sl  is not None and l <= sl + EPS),
            "tp1": (tp1 is not None and h >= tp1 + buf - EPS),
            "tp2": (tp2 is not None and h >= tp2 + buf - EPS),
            "tp3": (tp3 is not None and h >= tp3 + buf - EPS),
            "tp4": (tp4 is not None and h >= tp4 + buf - EPS),
        }
    def short_map(h, l):
        return {
            "sl":  (sl  is not None and h >= sl - EPS),
            "tp1": (tp1 is not None and l <= tp1 - buf + EPS),
            "tp2": (tp2 is not None and l <= tp2 - buf + EPS),
            "tp3": (tp3 is not None and l <= tp3 - buf + EPS),
            "tp4": (tp4 is not None and l <= tp4 - buf + EPS),
        }
    return long_map if side == "long" else short_map

def hit_seq_for_interval(symbol: str, side: str, sl: Optional[float], tps: List[Optional[float]],
                         ohlcv: List[List], hits_before: int) -> Tuple[int, bool, bool]:
    hits = hits_before
    buf  = _buf_for(symbol)
    mapper = _touch_map(side, sl, tps, buf)

    for _, _o, h, l, _c, _v in ohlcv:
        touch = mapper(h, l)

        # which next TP is newly reachable, sequentially
        next_tp = None
        if hits < 1 and touch["tp1"]: next_tp = 1
        elif hits < 2 and touch["tp2"]: next_tp = 2
        elif hits < 3 and touch["tp3"]: next_tp = 3
        elif hits < 4 and touch["tp4"]: next_tp = 4

        # same-candle SL + next TP -> TP wins
        if touch["sl"] and next_tp is not None:
            hits = max(hits, next_tp)
            continue

        if touch["sl"]:
            special = (hits >= 1 and (tps[1] is None or hits < 2))
            return hits, True, special

        if next_tp is not None:
            hits = max(hits, next_tp)
            continue

    return hits, False, False

async def recompute_hits_full(symbol: str, side: str, sl: Optional[float], tps: List[Optional[float]],
                              anchor_ms: int) -> int:
    """One-off, full recompute from anchor to now (used to confirm before announcing SL)."""
    ohlcv = await td_time_series_1m(symbol, anchor_ms)
    hits, _, _ = hit_seq_for_interval(symbol, side, sl, tps, ohlcv, 0)
    return hits

# ---------- Telegram wiring ----------
def load_session_string() -> Optional[str]:
    try:
        with open(SESSION_STRING_PATH, "r") as f:
            s = f.read().strip()
            return s or None
    except FileNotFoundError:
        return None

sess_str = load_session_string()
client = TelegramClient(StringSession(sess_str) if sess_str else StringSession(), API_ID, API_HASH)

async def reply_status(chat_id: int, msg_id: int, text: str):
    try:
        await client.send_message(entity=chat_id, message=text, reply_to=msg_id)
    except Exception as e:
        # Just log warning, don't crash or spam too much
        print(f"Warning: Failed to reply to status in chat {chat_id} (likely no admin rights). Error: {e}")

def _fmt(n: float) -> str:
    if n is None: return ""
    return f"{n:.5f}".rstrip('0').rstrip('.')

def format_signal_smart(alias, asset_type, side, symbol, entry, sl, tps, raw_text):
    style = ASSET_STYLES.get(asset_type, ASSET_STYLES["UNKNOWN"])
    emoji = style["emoji"]
    color = style["color"]
    
    commentary = get_smart_commentary(raw_text)
    
    msg = f"{emoji} **{alias} PREMIUM** {emoji}\n"
    msg += f"━━━━━━━━━━━━━━━━━━━━\n"
    msg += f"{color} **{symbol}**\n"
    msg += f"**Action:** {side.upper()} {entry}\n"
    msg += f"━━━━━━━━━━━━━━━━━━━━\n"
    
    for i, tp in enumerate(tps, 1):
        msg += f"🎯 **TP{i}:** {tp}\n"
    
    if sl:
        msg += f"🛑 **SL:** {sl}\n"
        
    msg += f"━━━━━━━━━━━━━━━━━━━━\n"
    msg += f"🧠 **Analyst Note:**\n_{commentary}_\n"
    msg += f"{style['tag']}"
        
    return msg

async def send_to_website(data: dict):
    """Sends signal update to the website API."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(WEBSITE_API_URL, json=data) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    print(f"Website API Error: {resp.status} - {text}")
                else:
                    print(f"Successfully sent signal to website: {data['symbol']} {data['status']}")
    except Exception as e:
        print(f"Failed to send to website: {e}")

def filter_ohlcv_after(ohlcv: List[List], cutoff_ms: int) -> List[List]:
    i = 0
    while i < len(ohlcv) and ohlcv[i][0] < cutoff_ms:
        i += 1
    return ohlcv[i:]

# ---------- TD-driven check per record ----------
async def run_check_for_record(r: Dict[str, Any], cache: Dict[str, List[List]]):
    rec_id  = int(r["id"])
    symbol  = r["symbol"]
    side    = r["side"]
    sl      = r["sl"] if r["sl"] is not None else None
    tps     = [r["tp1"], r["tp2"], r["tp3"], r.get("tp4")]

    # robust timestamps
    anchor_ms = int((r.get("anchor_ts") or r.get("created_at") or int(time.time()))) * 1000
    last_ms   = int((r.get("last_check_ts") or r.get("created_at") or int(time.time()))) * 1000

    # only when a new 1m candle started
    now_dt = datetime.now(tz=timezone.utc)
    current_candle_start_ms = int(datetime(now_dt.year, now_dt.month, now_dt.day, now_dt.hour, now_dt.minute, tzinfo=timezone.utc).timestamp() * 1000)
    if last_ms >= current_candle_start_ms:
        return

    since_ms = max(anchor_ms, last_ms - 60_000)
    base = cache.get(symbol, [])
    ohlcv = filter_ohlcv_after(base, since_ms)
    if not ohlcv:
        await update_signal(rec_id, last_check_ts=int(time.time()))
        return

    hits_before = int(r["hits"])
    hits_done, sl_hit, special = hit_seq_for_interval(symbol, side, sl, tps, ohlcv, hits_before)
    new_hits = max(hits_before, hits_done)

    # --- SL protection: confirm with a full recompute before announcing ---
    if sl_hit:
        full_hits = await recompute_hits_full(symbol, side, sl, tps, anchor_ms)
        # if full recompute shows TP≥1 at any time, we suppress SL announcement
        if full_hits >= 1:
            await update_signal(rec_id,
                                last_check_ts=int(time.time()),
                                hits=max(new_hits, full_hits),
                                status="closed",
                                close_reason=f"TP{max(new_hits, full_hits)}_hit_then_SL_ignored")
            return

    # DB updates
    updates = {"last_check_ts": int(time.time()), "hits": new_hits}
    closed = False; reason = None
    if sl_hit:
        closed = True; reason = "SL_hit" if not special else "SL_after_TP1_before_TP2"
    elif new_hits >= 4 or (new_hits >= 1 and all(x is None for x in tps[1:])):
        closed = True; reason = f"TP{new_hits}_hit"
    if closed:
        updates["status"] = "closed"; updates["close_reason"] = reason
    await update_signal(rec_id, **updates)

    # de-dup
    now_s = int(time.time())
    last_hit_sent = ANNOUNCED_LAST_HIT.get(rec_id, 0)
    last_ts_sent  = ANNOUNCED_LAST_TS.get(rec_id, 0)

    def _may_send(hit_n: int) -> bool:
        if hit_n <= last_hit_sent: return False
        if now_s - last_ts_sent < ANNOUNCE_COOLDOWN_SEC: return False
        return True

    # announce
    # announce
    
    # Helper for metrics
    def calc_metrics(exit_price: float):
        entry = r["entry"]
        sl = r["sl"]
        if not sl: return 0, 0, 0, 0
        
        risk_pips = abs(entry - sl)
        reward_pips = abs(entry - exit_price)
        
        # Avoid division by zero
        if risk_pips < EPS: return 0, 0, 0, 0
        
        rr = reward_pips / risk_pips
        profit = 1000 * rr
        
        # Adjust pips for display (optional, but keeping raw for now as per plan)
        # If we want to display "20 pips" instead of "0.0020", we need the multiplier logic.
        # For now, let's send raw price diffs as "pips" to be consistent with previous logic,
        # but the frontend might want to format it.
        # Actually, let's try to normalize pips for the "pips" field if possible, 
        # but for risk/reward calculations, raw price diff ratio is correct for RR.
        
        return risk_pips, reward_pips, rr, profit

    if sl_hit:
        text = "❌ SL Hit."
        if r.get("target_chat_id") and r.get("target_msg_id"):
            await reply_status(r["target_chat_id"], r["target_msg_id"], text)
        ANNOUNCED_LAST_TS[rec_id] = now_s # Changed from ANNOUNCED_SL_HIT to ANNOUNCED_LAST_TS to match original logic
        
        # Send SL to website
        risk, reward, rr, profit = calc_metrics(sl)
        # For SL, profit is -1000 (approx, since we hit SL)
        # But let's use the calculated one. If SL hit, reward is distance to SL.
        # Wait, if SL hit, we LOST. Profit should be negative.
        # My formula: profit = 1000 * rr. 
        # If SL hit, we lost 1R. So profit should be -1000.
        # Let's force it for SL hit to be consistent with the model.
        final_profit = -1000.0
        
        # Get Alias
        config = CHANNELS_CONFIG.get(r["chat_id"])
        channel_name = config["alias"] if config else r.get("chat_title", "Unknown")

        await send_to_website({
            "symbol": symbol,
            "type": side.upper(),
            "status": "SL_HIT",
            "pips": -risk, # Negative risk distance
            "tp_level": 0,
            "channel_id": r["chat_id"],
            "channel_name": channel_name,
            "risk_pips": risk,
            "reward_pips": 0,
            "rr_ratio": -1.0,
            "profit": final_profit,
            "open_time": datetime.fromtimestamp(r["created_at"], tz=timezone.utc).isoformat()
        })
        return

    if new_hits > hits_before and _may_send(new_hits):
        text = f"✅ {fmt_hits(new_hits)} truffet."
        if r.get("target_chat_id") and r.get("target_msg_id"):
            print(f"DEBUG: Replying to destination {r['target_chat_id']} (Source: {r['chat_id']})")
            await reply_status(r["target_chat_id"], r["target_msg_id"], text)
        else:
            print(f"DEBUG: No target_chat_id for signal {rec_id}, skipping reply.")
        ANNOUNCED_LAST_HIT[rec_id] = new_hits
        ANNOUNCED_LAST_TS[rec_id]  = now_s
        
        # Send TP Hit to website
        tp_price = tps[new_hits-1] if new_hits > 0 else r["entry"]
        risk, reward, rr, profit = calc_metrics(tp_price)
        
        # Get Alias
        config = CHANNELS_CONFIG.get(r["chat_id"])
        channel_name = config["alias"] if config else r.get("chat_title", "Unknown")

        await send_to_website({
            "symbol": symbol,
            "type": side.upper(),
            "status": "TP_HIT",
            "pips": reward,
            "tp_level": new_hits,
            "is_win": True,
            "channel_id": r["chat_id"],
            "channel_name": channel_name,
            "risk_pips": risk,
            "reward_pips": reward,
            "rr_ratio": rr,
            "profit": profit,
            "open_time": datetime.fromtimestamp(r["created_at"], tz=timezone.utc).isoformat()
        })

    if closed and not sl_hit and new_hits >= 4 and _may_send(new_hits):
        text = "🎯 TP4 truffet — ferdig!"
        if r.get("target_chat_id") and r.get("target_msg_id"):
            await reply_status(r["target_chat_id"], r["target_msg_id"], text)
        ANNOUNCED_LAST_HIT[rec_id] = new_hits
        ANNOUNCED_LAST_TS[rec_id]  = now_s

def fmt_hits(h: int) -> str:
    return {0: "Ingen TP", 1: "TP1", 2: "TP2", 3: "TP3", 4: "TP4"}[h]

async def batch_fetch_ohlcv(open_recs: List[Dict[str, Any]]) -> Dict[str, List[List]]:
    mins: Dict[str, int] = {}
    for r in open_recs:
        sym = r["symbol"]
        if not sym or sym.strip() == "": continue
        if not td_map_symbol(sym): continue
        anchor_ms = int((r.get("anchor_ts") or r["created_at"])) * 1000
        last_ms   = int((r.get("last_check_ts") or r["created_at"])) * 1000
        since_ms  = max(anchor_ms, last_ms - 60_000)
        mins[sym] = min(mins.get(sym, since_ms), since_ms)

    out: Dict[str, List[List]] = {}
    for sym, since_ms in mins.items():
        out[sym] = await td_time_series_1m(sym, since_ms)
        await asyncio.sleep(0.2)
    return out

# ---------- Listeners ----------
@client.on(events.NewMessage(chats=TARGET_CHAT_IDS))
async def on_new_signal(evt: events.NewMessage.Event):
    msg: Message = evt.message
    
    chat_title = msg.chat.title if hasattr(msg.chat, 'title') else 'Unknown'
    # Sanitize for Windows console
    safe_msg = msg.message[:30].encode('ascii', 'replace').decode('ascii')
    safe_title = chat_title.encode('ascii', 'replace').decode('ascii')
    print(f"DEBUG: Msg from {msg.chat_id} ({safe_title}): {safe_msg}...")
    print("DEBUG: Fence Bot v2.1 - Reply Fix Active")

    
    # Check for Reply (Update to existing signal)
    if msg.is_reply:
        reply_header = await msg.get_reply_message()
        if reply_header:
            await handle_reply_update(msg, reply_header.id)
            return

    parsed = parse_signal_text(msg.message)
    if not parsed:
        print(f"DEBUG: Failed to parse message from {msg.chat_id}")
        return
    
    print(f"DEBUG: Successfully parsed signal: {parsed['symbol']} {parsed['side']}")

    # --- Deduplication Check ---
    # Ignore if we received the same signal (Symbol + Side + Channel) in the last 15 minutes
    msg_ts = int(msg.date.replace(tzinfo=timezone.utc).timestamp())
    min_ts = msg_ts - (15 * 60) # 15 minutes ago

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT id FROM signals WHERE chat_id=? AND symbol=? AND side=? AND created_at >= ?",
            (msg.chat_id, parsed['symbol'], parsed['side'], min_ts)
        ) as cursor:
            if await cursor.fetchone():
                print(f"DEBUG: Skipping DUPLICATE signal: {parsed['symbol']} ({parsed['side']}) from {msg.chat_id}")
                return

    # --- Deduplication Check ---
    # Ignore if we received the same signal (Symbol + Side + Channel) in the last 15 minutes
    msg_ts = int(msg.date.replace(tzinfo=timezone.utc).timestamp())
    min_ts = msg_ts - (15 * 60) # 15 minutes ago

    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT id FROM signals WHERE chat_id=? AND symbol=? AND side=? AND created_at >= ?",
            (msg.chat_id, parsed['symbol'], parsed['side'], min_ts)
        ) as cursor:
            if await cursor.fetchone():
                print(f"DEBUG: Skipping DUPLICATE signal: {parsed['symbol']} ({parsed['side']}) from {msg.chat_id}")
                return

    msg_ts = int(msg.date.replace(tzinfo=timezone.utc).timestamp())
    anchor = ceil_to_next_minute_utc(msg_ts)

    chat = await evt.get_chat()
    chat_title = getattr(chat, 'title', 'Unknown Channel')

    rec = {
        "chat_id": msg.chat_id,
        "chat_title": chat_title,
        "msg_id": msg.id,
        **parsed,
        "created_at": msg_ts,
        "anchor_ts": anchor,
        "hits": 0,
        "status": "open"
    }
    
    # Send to Target Channel (Smart Format)
    config = CHANNELS_CONFIG.get(msg.chat_id)
    if config:
        alias = config["alias"]
        target_id = config["target_id"]
        asset_type = config.get("type", "UNKNOWN")
        
        tps = []
        if rec['tp1']: tps.append(rec['tp1'])
        if rec['tp2']: tps.append(rec['tp2'])
        if rec['tp3']: tps.append(rec['tp3'])
        if rec['tp4']: tps.append(rec['tp4'])
        
        smart_text = format_signal_smart(alias, asset_type, rec['side'], rec['symbol'], rec['entry'], rec['sl'], tps, msg.message)
        
        try:
            sent_msg = await client.send_message(target_id, smart_text)
            rec["target_chat_id"] = target_id
            rec["target_msg_id"] = sent_msg.id
            print(f"Forwarded new signal to {alias}: {rec['symbol']}")
            
            # Send NEW signal to website (for upsert/deduplication)
            try:
                await send_to_website({
                    "symbol": rec["symbol"],
                    "type": rec["side"].upper(),
                    "status": "NEW",
                    "entry": rec["entry"],
                    "sl": rec["sl"],
                    "tp1": rec["tp1"],
                    "tp2": rec["tp2"],
                    "tp3": rec["tp3"],
                    "tp4": rec["tp4"],
                    "channel_id": rec["chat_id"],
                    "channel_name": alias,
                    "open_time": datetime.fromtimestamp(rec["created_at"], tz=timezone.utc).isoformat()
                })
            except Exception as e:
                print(f"Failed to send NEW signal to website: {e}")
        except Exception as e:
            print(f"Failed to forward to target channel: {e}")

    await insert_signal(rec)
    # keep silent on registration to reduce noise

async def handle_reply_update(msg: Message, original_msg_id: int):
    """
    Parses a reply message to check for TP/SL hits and updates the signal.
    """
    text = msg.message.lower()
    
    # 1. Identify the update type
    new_hits = None
    status = None
    close_reason = None
    
    if "tp1" in text or "tp 1" in text: new_hits = 1
    elif "tp2" in text or "tp 2" in text: new_hits = 2
    elif "tp3" in text or "tp 3" in text: new_hits = 3
    elif "tp4" in text or "tp 4" in text: new_hits = 4
    
    # Breakeven / SL Entry detection
    elif ("breakeven" in text or "break even" in text or "be" in text.split() or 
          ("entry" in text and ("sl" in text or "stop" in text))):
        status = "BREAKEVEN"
        
    elif "sl hit" in text or "stop loss" in text:
        status = "SL_HIT"
        close_reason = "SL_hit_via_telegram"
    elif "close" in text and "now" in text:
        status = "closed"
        close_reason = "manual_close_via_telegram"
        
    if new_hits is None and status is None:
        return # Not a relevant update

    # 2. Find the original signal in DB
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM signals WHERE chat_id = ? AND msg_id = ?", (msg.chat_id, original_msg_id))
        r = await cursor.fetchone()
        
        if not r:
            print(f"Original signal not found for reply: {msg.id} -> {original_msg_id}")
            return

        # 3. Update logic
        current_hits = r['hits']
        rec_id = r['id']
        symbol = r['symbol']
        side = r['side']
        
        updates = {}
        
        # Handle TP Hit
        if new_hits is not None and new_hits > current_hits:
            updates['hits'] = new_hits
            updates['last_check_ts'] = int(time.time())
            
            # Calculate RR (Risk-Reward Ratio)
            entry = float(r["entry"])
            sl = float(r["sl"])
            tp_value = None
            
            # Get the TP level that was hit
            if new_hits == 1:
                tp_value = float(r["tp1"])
            elif new_hits == 2:
                tp_value = float(r["tp2"])
            elif new_hits == 3:
                tp_value = float(r["tp3"])
            elif new_hits == 4 and r.get("tp4"):
                tp_value = float(r["tp4"])
            
            # Calculate RR
            risk_pips = abs(entry - sl)
            reward_pips = abs(tp_value - entry) if tp_value else 0
            rr_ratio = round(reward_pips / risk_pips, 2) if risk_pips > 0 else 0
            
            # Profit calculation: Assuming 1% risk per trade, profit = RR * 1000
            profit = round(rr_ratio * 1000, 2)
            
            # Get Alias
            config = CHANNELS_CONFIG.get(r["chat_id"])
            channel_name = config["alias"] if config else (r["chat_title"] or "Unknown")

            await send_to_website({
                "symbol": symbol,
                "type": side.upper(),
                "status": "TP_HIT",
                "pips": round(reward_pips, 2),
                "tp_level": new_hits,
                "is_win": True,
                "channel_id": r["chat_id"],
                "channel_name": channel_name,
                "risk_pips": round(risk_pips, 2),
                "reward_pips": round(reward_pips, 2),
                "rr_ratio": rr_ratio,
                "profit": profit,
                "open_time": datetime.fromtimestamp(r["created_at"], tz=timezone.utc).isoformat()
            })
            print(f"Telegram Update: {symbol} TP{new_hits} Hit! RR: {rr_ratio}R (${profit})")

        # Handle Breakeven (Website Only, Keep Open In DB)
        elif status == "BREAKEVEN":
            # Get Alias
            config = CHANNELS_CONFIG.get(r["chat_id"])
            channel_name = config["alias"] if config else (r["chat_title"] or "Unknown")

            await send_to_website({
                "symbol": symbol,
                "type": side.upper(),
                "status": "BREAKEVEN",
                "pips": 0,
                "tp_level": current_hits, # Keep current TP level if any
                "channel_id": r["chat_id"],
                "channel_name": channel_name,
                "risk_pips": 0,
                "reward_pips": 0,
                "rr_ratio": 0,
                "profit": 0, # Explicit $0
                "open_time": datetime.fromtimestamp(r["created_at"], tz=timezone.utc).isoformat()
            })
            print(f"Telegram Update: {symbol} Moved to BREAKEVEN - Logged to website")
            
            if r['target_chat_id'] and r['target_msg_id']:
                 try:
                     await reply_status(r['target_chat_id'], r['target_msg_id'], f"🛡️ **Breakeven** (Entry Secured)\n#{symbol}")
                 except: pass

        # Handle SL/Close
        elif status:
            updates['status'] = "closed" # DB status is simplified
            updates['close_reason'] = close_reason
            updates['last_check_ts'] = int(time.time())
            
            # Only log SL to website if NO TPs were hit (pure loss)
            if status == "SL_HIT" and current_hits == 0:
                # Get Alias
                config = CHANNELS_CONFIG.get(r["chat_id"])
                channel_name = config["alias"] if config else (r["chat_title"] or "Unknown")

                await send_to_website({
                    "symbol": symbol,
                    "type": side.upper(),
                    "status": "SL_HIT",
                    "pips": 0,
                    "tp_level": 0,
                    "is_win": False,
                    "channel_id": r["chat_id"],
                    "channel_name": channel_name,
                    "risk_pips": 0,
                    "reward_pips": 0,
                    "rr_ratio": 0,
                    "profit": -1000,
                    "open_time": datetime.fromtimestamp(r["created_at"], tz=timezone.utc).isoformat()
                })
                print(f"Telegram Update: {symbol} SL HIT (Pure Loss) - Logged to website")
            elif status == "SL_HIT" and current_hits > 0:
                print(f"Telegram Update: {symbol} SL HIT after TP{current_hits} - NOT logged (partial win)")
            else:
                print(f"Telegram Update: {symbol} {status}!")

        if updates:
            await update_signal(rec_id, **updates)
            
            # Update the Target Channel (Reply Thread)
            target_chat_id = r['target_chat_id']
            target_msg_id = r['target_msg_id']
            
            if target_chat_id and target_msg_id:
                update_msg = ""
                if new_hits:
                    update_msg = f"✅ **TP{new_hits} HIT!** 🚀\n#{symbol}"
                elif status == "SL_HIT":
                    update_msg = f"❌ **SL HIT**\n#{symbol}"
                elif status == "closed":
                    update_msg = f"🔒 **CLOSED**\n#{symbol}"
                
                if update_msg:
                    try:
                        await client.send_message(target_chat_id, update_msg, reply_to=target_msg_id)
                        print(f"Replied to thread in target channel: {update_msg}")
                    except Exception as e:
                        print(f"Failed to reply to thread: {e}")


# ---------- Loop ----------
async def checker_loop():
    backoff_until = 0
    while True:
        try:
            now_s = int(time.time())
            if now_s < backoff_until:
                await asyncio.sleep(30); continue

            open_recs = await get_open_signals_recent(MAX_SIGNAL_AGE_DAYS)
            if not open_recs:
                await asyncio.sleep(CHECK_EVERY_SECONDS_BASE); continue

            cache = await batch_fetch_ohlcv(open_recs)
            for r in open_recs:
                await run_check_for_record(r, cache)
                await asyncio.sleep(0.2)

            # align to next minute
            now = datetime.now(tz=timezone.utc)
            next_min = datetime(now.year, now.month, now.day, now.hour, now.minute, tzinfo=timezone.utc) + timedelta(minutes=1)
            sleep_edge = (next_min - now).total_seconds() + 2
            await asyncio.sleep(max(sleep_edge, CHECK_EVERY_SECONDS_BASE))

        except RuntimeError as e:
            if "TD_OUT_OF_CREDITS" in str(e):
                now = datetime.now(tz=timezone.utc)
                nxt = datetime(now.year, now.month, now.day, 0, 0, tzinfo=timezone.utc) + timedelta(days=1, minutes=2)
                backoff_until = int(nxt.timestamp())
                print("TD credits brukt opp. Pauser til", nxt.isoformat())
            await asyncio.sleep(60)
        except Exception as e:
            print("Loop error:", e)
            await asyncio.sleep(15)

# ---------- Main ----------
async def main():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA journal_mode=WAL")
    await db_init()
    await warm_start_open_signals()
    await client.start()
    with open(SESSION_STRING_PATH, "w") as f:
        f.write(client.session.save())
    print("TD watcher (økonomi + SL double-check + warm-start) kjører…")
    await asyncio.gather(
        checker_loop(),
        client.run_until_disconnected()
    )

if __name__ == "__main__":
    asyncio.run(main())
