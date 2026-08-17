import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || "e319e4cc7cec44ad975841ded108a985";

interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

// Safely parse timestamps in various formats (ISO, space-separated, unix ms)
function parseTimestamp(val: string | null): number {
  if (!val) return 0;
  const clean = val.trim();
  if (/^\d{10,13}$/.test(clean)) {
    const num = parseInt(clean, 10);
    return num < 10000000000 ? num * 1000 : num;
  }
  try {
    const isoClean = clean.endsWith("Z") || clean.includes("+")
      ? clean
      : clean.includes("T")
        ? `${clean}Z`
        : clean.replace(" ", "T") + "Z";
    const d = new Date(isoClean);
    const time = d.getTime();
    if (!Number.isNaN(time) && time > 0) return time;
  } catch {}
  
  const fallback = new Date(clean).getTime();
  return Number.isNaN(fallback) ? 0 : fallback;
}

// Helper to normalize symbol for Twelve Data
function normalizeTwelveDataSymbol(rawSymbol: string): string {
  const sym = rawSymbol.toUpperCase().trim();
  if (sym === "XAUUSD" || sym === "GOLD") return "XAU/USD";
  if (sym === "BTCUSD" || sym === "BTC") return "BTC/USD";
  if (sym === "ETHUSD" || sym === "ETH") return "ETH/USD";
  if (sym === "NAS100" || sym === "US100" || sym === "NDX") return "QQQ";
  if (sym === "US30" || sym === "DJI") return "DIA";
  if (sym.length === 6 && !sym.includes("/")) {
    return `${sym.slice(0, 3)}/${sym.slice(3)}`;
  }
  return sym;
}

// Generate realistic candles strictly within the trade's real historical timeframe
function generateRealisticCandles(
  entry: number,
  exitPrice: number,
  sl: number,
  openTimeMs: number,
  closeTimeMs: number,
  isBuy: boolean,
  isWin: boolean,
  seed: string
): Candle[] {
  const candles: Candle[] = [];
  const candleIntervalMs = 15 * 60 * 1000; // 15-minute candles
  const random = createSeededRandom(hashSeed(seed));
  
  // Start 2.5 hours before trade entry for market context
  const startTimeMs = openTimeMs - 10 * candleIntervalMs;
  // End 2 hours after exit
  const endTimeMs = Math.max(closeTimeMs + 8 * candleIntervalMs, openTimeMs + 18 * candleIntervalMs);
  
  const totalSteps = Math.max(20, Math.floor((endTimeMs - startTimeMs) / candleIntervalMs));
  const entryStepIndex = 10;
  const exitStepIndex = Math.min(totalSteps - 4, Math.max(entryStepIndex + 4, Math.floor((closeTimeMs - startTimeMs) / candleIntervalMs)));
  
  const stepDiff = Math.abs(entry * 0.0018);
  let currentPrice = isBuy ? entry - stepDiff * 2 : entry + stepDiff * 2;

  for (let i = 0; i < totalSteps; i++) {
    const time = Math.floor((startTimeMs + i * candleIntervalMs) / 1000);
    const open = currentPrice;
    let targetPrice = open;

    if (i < entryStepIndex) {
      // Approaching entry
      const progress = i / entryStepIndex;
      targetPrice = currentPrice + (entry - currentPrice) * 0.35 + (random() - 0.48) * stepDiff;
    } else if (i === entryStepIndex) {
      // Exactly at entry
      targetPrice = entry;
    } else if (i <= exitStepIndex) {
      // Moving towards target (TP or SL)
      const tradeProgress = (i - entryStepIndex) / Math.max(1, (exitStepIndex - entryStepIndex));
      const targetEnd = isWin ? exitPrice : sl;
      targetPrice = entry + (targetEnd - entry) * tradeProgress + (random() - 0.5) * (stepDiff * 0.7);
    } else {
      // Post-trade consolidation
      targetPrice = currentPrice + (random() - 0.5) * stepDiff;
    }

    const decimals = entry > 500 ? 2 : entry > 10 ? 4 : 5;
    const close = Number(targetPrice.toFixed(decimals));
    let high = Number((Math.max(open, close) + random() * stepDiff * 0.8).toFixed(decimals));
    let low = Number((Math.min(open, close) - random() * stepDiff * 0.8).toFixed(decimals));

    if (i === exitStepIndex) {
      if (isWin) {
        high = Number((isBuy ? Math.max(high, exitPrice) : high).toFixed(decimals));
        low = Number((isBuy ? low : Math.min(low, exitPrice)).toFixed(decimals));
      } else {
        high = Number((isBuy ? high : Math.max(high, sl)).toFixed(decimals));
        low = Number((isBuy ? Math.min(low, sl) : low).toFixed(decimals));
      }
    }

    candles.push({
      time,
      open,
      high,
      low,
      close,
    });

    currentPrice = close;
  }

  return candles;
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "XAUUSD";
    const type = (searchParams.get("type") || "BUY").toUpperCase();
    const openTimeStr = searchParams.get("openTime") || "";
    const closeTimeStr = searchParams.get("closeTime") || "";
    const status = searchParams.get("status") || "TP_HIT";
    
    const entry = parseFloat(searchParams.get("entry") || "2400");
    const tp = parseFloat(searchParams.get("tp") || "2420");
    const sl = parseFloat(searchParams.get("sl") || "2390");

    const isBuy = type.includes("BUY") || type.includes("LONG");
    const isWin = status.includes("TP") || status.includes("WIN");

    // Parse exact historical trade dates
    let parsedOpenTime = parseTimestamp(openTimeStr);
    let parsedCloseTime = parseTimestamp(closeTimeStr);

    if (!parsedOpenTime) {
      parsedOpenTime = Date.now() - 4 * 24 * 3600 * 1000;
    }
    if (!parsedCloseTime || parsedCloseTime <= parsedOpenTime) {
      parsedCloseTime = parsedOpenTime + 3 * 3600 * 1000;
    }

    const tradeStartMs = parsedOpenTime - 3 * 3600 * 1000; // 3 hours before
    const tradeEndMs = parsedCloseTime + 3 * 3600 * 1000;   // 3 hours after

    // 1. Try fetching exact historical candles from Binance for crypto
    if (symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("SOL")) {
      try {
        const binancePair = symbol.toUpperCase().replace("/", "").replace("USD", "USDT");
        const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${binancePair}&interval=15m&startTime=${tradeStartMs}&endTime=${tradeEndMs}&limit=100`;
        const bRes = await fetch(binanceUrl, { next: { revalidate: 86400 } });
        if (bRes.ok) {
          const rawData = await bRes.json();
          if (Array.isArray(rawData) && rawData.length > 3) {
            const candles: Candle[] = rawData.map((item: any) => ({
              time: Math.floor(item[0] / 1000),
              open: parseFloat(item[1]),
              high: parseFloat(item[2]),
              low: parseFloat(item[3]),
              close: parseFloat(item[4]),
            }));
            return NextResponse.json({
              candles,
              source: "binance",
              openTimeSec: Math.floor(parsedOpenTime / 1000),
              closeTimeSec: Math.floor(parsedCloseTime / 1000),
            });
          }
        }
      } catch (e) {
        console.warn("Binance fetch error:", e);
      }
    }

    // 2. Try Twelve Data with exact historical start_date and end_date
    if (TWELVE_DATA_API_KEY) {
      try {
        const tdSymbol = normalizeTwelveDataSymbol(symbol);
        const startDateStr = new Date(tradeStartMs).toISOString().slice(0, 19).replace("T", " ");
        const endDateStr = new Date(tradeEndMs).toISOString().slice(0, 19).replace("T", " ");

        const tdUrl = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=15min&start_date=${encodeURIComponent(startDateStr)}&end_date=${encodeURIComponent(endDateStr)}&timezone=UTC&apikey=${TWELVE_DATA_API_KEY}`;
        
        const tdRes = await fetch(tdUrl, { next: { revalidate: 86400 } });
        if (tdRes.ok) {
          const tdData = await tdRes.json();
          if (tdData.values && Array.isArray(tdData.values) && tdData.values.length > 3) {
            const candles: Candle[] = tdData.values
              .map((v: any) => ({
                time: Math.floor(new Date(v.datetime.includes("Z") ? v.datetime : `${v.datetime}Z`).getTime() / 1000),
                open: parseFloat(v.open),
                high: parseFloat(v.high),
                low: parseFloat(v.low),
                close: parseFloat(v.close),
              }))
              .sort((a: Candle, b: Candle) => a.time - b.time);

            return NextResponse.json({
              candles,
              source: "twelvedata",
              openTimeSec: Math.floor(parsedOpenTime / 1000),
              closeTimeSec: Math.floor(parsedCloseTime / 1000),
            });
          }
        }
      } catch (e) {
        console.warn("Twelve Data fetch error:", e);
      }
    }

    // 3. High-fidelity reconstructed fallback using exact trade timestamps
    const seed = `${symbol}:${type}:${status}:${entry}:${tp}:${sl}:${parsedOpenTime}:${parsedCloseTime}`;
    const candles = generateRealisticCandles(entry, tp, sl, parsedOpenTime, parsedCloseTime, isBuy, isWin, seed);
    return NextResponse.json({
      candles,
      source: "reconstructed",
      openTimeSec: Math.floor(parsedOpenTime / 1000),
      closeTimeSec: Math.floor(parsedCloseTime / 1000),
    });
  } catch (error) {
    console.error("Failed to generate candles", error);
    return NextResponse.json({ error: "Failed to generate candles" }, { status: 500 });
  }
}
