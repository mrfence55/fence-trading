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

// Helper to normalize symbol for Twelve Data
function normalizeTwelveDataSymbol(rawSymbol: string): string {
  const sym = rawSymbol.toUpperCase().trim();
  if (sym === "XAUUSD" || sym === "GOLD") return "XAU/USD";
  if (sym === "BTCUSD" || sym === "BTC") return "BTC/USD";
  if (sym === "ETHUSD" || sym === "ETH") return "ETH/USD";
  if (sym === "NAS100" || sym === "US100") return "QQQ"; // Stock index ETF or direct
  if (sym === "US30") return "DIA";
  if (sym.length === 6 && !sym.includes("/")) {
    return `${sym.slice(0, 3)}/${sym.slice(3)}`;
  }
  return sym;
}

// Generate high-fidelity realistic price path if external API fails or is rate-limited
function generateRealisticCandles(
  entry: number,
  exitPrice: number,
  sl: number,
  openTimeMs: number,
  closeTimeMs: number,
  isBuy: boolean,
  isWin: boolean
): Candle[] {
  const candles: Candle[] = [];
  const candleIntervalMs = 15 * 60 * 1000; // 15-minute candles
  
  // Start 2 hours before trade entry for context
  const startTimeMs = openTimeMs - 8 * candleIntervalMs;
  // End 1 hour after exit
  const endTimeMs = Math.max(closeTimeMs + 4 * candleIntervalMs, openTimeMs + 12 * candleIntervalMs);
  
  const totalSteps = Math.max(16, Math.floor((endTimeMs - startTimeMs) / candleIntervalMs));
  const entryStepIndex = 8;
  const exitStepIndex = Math.min(totalSteps - 4, Math.max(entryStepIndex + 4, Math.floor((closeTimeMs - startTimeMs) / candleIntervalMs)));
  
  // Baseline price variation
  const stepDiff = Math.abs(entry * 0.0015);
  let currentPrice = isBuy ? entry - stepDiff * 2 : entry + stepDiff * 2;

  for (let i = 0; i < totalSteps; i++) {
    const time = Math.floor((startTimeMs + i * candleIntervalMs) / 1000);
    const open = currentPrice;
    let targetPrice = open;

    if (i < entryStepIndex) {
      // Approaching entry
      const progress = i / entryStepIndex;
      targetPrice = currentPrice + (entry - currentPrice) * 0.4 + (Math.random() - 0.48) * stepDiff;
    } else if (i === entryStepIndex) {
      // Exactly at entry
      targetPrice = entry;
    } else if (i <= exitStepIndex) {
      // Moving towards target (TP or SL)
      const tradeProgress = (i - entryStepIndex) / Math.max(1, (exitStepIndex - entryStepIndex));
      const targetEnd = isWin ? exitPrice : sl;
      targetPrice = entry + (targetEnd - entry) * tradeProgress + (Math.random() - 0.5) * (stepDiff * 0.8);
    } else {
      // Post-trade consolidation
      targetPrice = currentPrice + (Math.random() - 0.5) * stepDiff;
    }

    const close = Number(targetPrice.toFixed(entry > 500 ? 2 : entry > 10 ? 4 : 5));
    const high = Number((Math.max(open, close) + Math.random() * stepDiff * 0.8).toFixed(entry > 500 ? 2 : entry > 10 ? 4 : 5));
    const low = Number((Math.min(open, close) - Math.random() * stepDiff * 0.8).toFixed(entry > 500 ? 2 : entry > 10 ? 4 : 5));

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

    const openTimeMs = openTimeStr ? new Date(openTimeStr).getTime() : Date.now() - 24 * 3600 * 1000;
    const closeTimeMs = closeTimeStr ? new Date(closeTimeStr).getTime() : openTimeMs + 4 * 3600 * 1000;

    // Try fetching from Binance for crypto
    if (symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("SOL")) {
      try {
        const binancePair = symbol.toUpperCase().replace("/", "").replace("USD", "USDT");
        const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${binancePair}&interval=15m&startTime=${openTimeMs - 8 * 15 * 60 * 1000}&limit=60`;
        const bRes = await fetch(binanceUrl, { next: { revalidate: 3600 } });
        if (bRes.ok) {
          const rawData = await bRes.json();
          if (Array.isArray(rawData) && rawData.length > 5) {
            const candles: Candle[] = rawData.map((item: any) => ({
              time: Math.floor(item[0] / 1000),
              open: parseFloat(item[1]),
              high: parseFloat(item[2]),
              low: parseFloat(item[3]),
              close: parseFloat(item[4]),
            }));
            return NextResponse.json({ candles, source: "binance" });
          }
        }
      } catch (e) {
        console.warn("Binance fetch error, fallback to generator:", e);
      }
    }

    // Try Twelve Data for Forex / Metals / Indices if API key is active
    if (TWELVE_DATA_API_KEY) {
      try {
        const tdSymbol = normalizeTwelveDataSymbol(symbol);
        const tdUrl = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=15min&outputsize=45&apikey=${TWELVE_DATA_API_KEY}`;
        const tdRes = await fetch(tdUrl, { next: { revalidate: 3600 } });
        if (tdRes.ok) {
          const tdData = await tdRes.json();
          if (tdData.values && Array.isArray(tdData.values) && tdData.values.length > 0) {
            const candles: Candle[] = tdData.values
              .map((v: any) => ({
                time: Math.floor(new Date(v.datetime).getTime() / 1000),
                open: parseFloat(v.open),
                high: parseFloat(v.high),
                low: parseFloat(v.low),
                close: parseFloat(v.close),
              }))
              .sort((a: Candle, b: Candle) => a.time - b.time);

            return NextResponse.json({ candles, source: "twelvedata" });
          }
        }
      } catch (e) {
        console.warn("Twelve Data fetch error, fallback to generator:", e);
      }
    }

    // High-fidelity fallback that guarantees smooth and realistic visualization
    const candles = generateRealisticCandles(entry, tp, sl, openTimeMs, closeTimeMs, isBuy, isWin);
    return NextResponse.json({ candles, source: "reconstructed" });
  } catch (error) {
    console.error("Failed to generate candles", error);
    return NextResponse.json({ error: "Failed to generate candles" }, { status: 500 });
  }
}
