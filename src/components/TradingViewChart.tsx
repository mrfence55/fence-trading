"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  createSeriesMarkers,
  ColorType,
  CrosshairMode,
  IChartApi,
  LineStyle,
  SeriesMarker,
  Time,
} from "lightweight-charts";

export interface TradeSignalData {
  id: number;
  symbol: string;
  type: string;
  status: string;
  entry?: number | null;
  sl?: number | null;
  tp1?: number | null;
  tp2?: number | null;
  tp3?: number | null;
  tp4?: number | null;
  pips?: number | null;
  tp_level?: number | null;
  open_time?: string;
  timestamp?: string;
  channel_name?: string;
  rr_ratio?: number | null;
  profit?: number | null;
}

interface TradingViewChartProps {
  signal: TradeSignalData;
  height?: number;
}

export function TradingViewChart({ signal, height = 430 }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>("");

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Initialize TradingView Chart with balanced margins for symmetric 1:1 view
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: "#060A12" },
        textColor: "#94a3b8",
        fontSize: 12,
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.04)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(56, 189, 248, 0.4)",
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: "rgba(56, 189, 248, 0.4)",
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        autoScale: true,
        scaleMargins: {
          top: 0.14,
          bottom: 0.14,
        },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // 2. Add Candlestick Series (v5 API)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });

    // 3. Compute accurate signal values with symmetric 1:1 RR distance for SL and TP3
    const isBuy = signal.type?.toUpperCase().includes("BUY") || signal.type?.toUpperCase().includes("LONG");
    const isWin = signal.status?.includes("TP") || (signal.pips !== null && signal.pips !== undefined && signal.pips > 0);
    
    const defaultEntry = signal.symbol?.includes("BTC") ? 64000 : signal.symbol?.includes("XAU") ? 2450 : 1.285;
    const entryPrice = signal.entry || defaultEntry;
    const targetSl = signal.sl || (isBuy ? entryPrice * 0.99 : entryPrice * 1.01);
    
    // Risk distance between entry and SL
    const riskDistance = Math.abs(entryPrice - targetSl);
    const decimals = entryPrice > 500 ? 1 : entryPrice > 10 ? 2 : 4;

    // Symmetrical 1:1 RR TP3 (same absolute distance from entry as SL)
    const symmetricalTp3 = signal.tp3 || Number((isBuy ? entryPrice + riskDistance : entryPrice - riskDistance).toFixed(decimals));
    const symmetricalTp2 = signal.tp2 || Number((isBuy ? entryPrice + riskDistance * 0.66 : entryPrice - riskDistance * 0.66).toFixed(decimals));
    const symmetricalTp1 = signal.tp1 || Number((isBuy ? entryPrice + riskDistance * 0.33 : entryPrice - riskDistance * 0.33).toFixed(decimals));

    const queryParams = new URLSearchParams({
      symbol: signal.symbol || "XAUUSD",
      type: signal.type || "BUY",
      openTime: signal.open_time || signal.timestamp || "",
      closeTime: signal.timestamp || "",
      status: signal.status || "TP_HIT",
      entry: entryPrice.toString(),
      tp: symmetricalTp3.toString(),
      sl: targetSl.toString(),
    });

    setIsLoading(true);
    fetch(`/api/candles?${queryParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.candles && Array.isArray(data.candles) && data.candles.length > 0) {
          candlestickSeries.setData(
            data.candles.map((c: any) => ({
              time: c.time as Time,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
            }))
          );
          setDataSource(data.source || "");

          // 4. Add Entry, TP1, TP2, TP3 (1:1 Target) and SL (1:1 Risk) Price Lines
          if (entryPrice) {
            candlestickSeries.createPriceLine({
              price: entryPrice,
              color: "#38bdf8",
              lineWidth: 2,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: true,
              title: `ENTRY: ${entryPrice}`,
            });
          }

          // Stop Loss Line (1:1 Risk)
          if (targetSl) {
            candlestickSeries.createPriceLine({
              price: targetSl,
              color: "#f43f5e",
              lineWidth: 2,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: true,
              title: `SL: ${targetSl} (1:1 Risk)`,
            });
          }

          // Symmetrical TP3 Main Target (1:1 RR)
          if (symmetricalTp3) {
            candlestickSeries.createPriceLine({
              price: symmetricalTp3,
              color: "#10b981",
              lineWidth: 2,
              lineStyle: LineStyle.Solid,
              axisLabelVisible: true,
              title: `TP3: ${symmetricalTp3} (1:1 RR)`,
            });
          }

          // Partial Take Profit Lines (TP1 & TP2)
          if (symmetricalTp1 && symmetricalTp1 !== symmetricalTp3) {
            candlestickSeries.createPriceLine({
              price: symmetricalTp1,
              color: "#34d399",
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              axisLabelVisible: true,
              title: `TP1: ${symmetricalTp1}`,
            });
          }

          if (symmetricalTp2 && symmetricalTp2 !== symmetricalTp3) {
            candlestickSeries.createPriceLine({
              price: symmetricalTp2,
              color: "#059669",
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              axisLabelVisible: true,
              title: `TP2: ${symmetricalTp2}`,
            });
          }

          if (signal.tp4) {
            candlestickSeries.createPriceLine({
              price: signal.tp4,
              color: "#047857",
              lineWidth: 1,
              lineStyle: LineStyle.Solid,
              axisLabelVisible: true,
              title: `TP4: ${signal.tp4}`,
            });
          }

          // 5. Intelligent marker placement based on exact price crossings
          const targetOpenSec = data.openTimeSec || data.candles[Math.min(8, data.candles.length - 1)].time;

          let bestEntryIndex = 0;
          let minEntryDiff = Infinity;

          for (let i = 0; i < data.candles.length; i++) {
            const entryDiff = Math.abs(data.candles[i].time - targetOpenSec);
            if (entryDiff < minEntryDiff) {
              minEntryDiff = entryDiff;
              bestEntryIndex = i;
            }
          }

          const bestEntryCandle = data.candles[bestEntryIndex];

          // Scan forward chronologically from the entry candle
          let bestExitCandle: any = null;
          let hitLevelLabel = isWin ? (signal.tp_level ? `TP${signal.tp_level}` : "TP") : "SL";

          for (let i = bestEntryIndex + 1; i < data.candles.length; i++) {
            const c = data.candles[i];
            if (isWin) {
              // Check from highest TP to lowest TP reached
              if (isBuy) {
                if (symmetricalTp3 && c.high >= symmetricalTp3) {
                  bestExitCandle = c;
                  hitLevelLabel = "TP3";
                  break;
                } else if (symmetricalTp2 && c.high >= symmetricalTp2) {
                  bestExitCandle = c;
                  hitLevelLabel = "TP2";
                  break;
                } else if (symmetricalTp1 && c.high >= symmetricalTp1) {
                  bestExitCandle = c;
                  hitLevelLabel = "TP1";
                  break;
                }
              } else {
                // Short direction
                if (symmetricalTp3 && c.low <= symmetricalTp3) {
                  bestExitCandle = c;
                  hitLevelLabel = "TP3";
                  break;
                } else if (symmetricalTp2 && c.low <= symmetricalTp2) {
                  bestExitCandle = c;
                  hitLevelLabel = "TP2";
                  break;
                } else if (symmetricalTp1 && c.low <= symmetricalTp1) {
                  bestExitCandle = c;
                  hitLevelLabel = "TP1";
                  break;
                }
              }
            } else {
              // SL Check
              if (isBuy && targetSl && c.low <= targetSl) {
                bestExitCandle = c;
                break;
              } else if (!isBuy && targetSl && c.high >= targetSl) {
                bestExitCandle = c;
                break;
              }
            }
          }

          // Fallback if no clean crossing candle detected: place exit 2-3 candles after entry
          if (!bestExitCandle) {
            const fallbackIndex = Math.min(bestEntryIndex + 3, data.candles.length - 1);
            bestExitCandle = data.candles[fallbackIndex];
          }

          const markers: SeriesMarker<Time>[] = [
            {
              time: bestEntryCandle.time as Time,
              position: isBuy ? "belowBar" : "aboveBar",
              color: "#38bdf8",
              shape: isBuy ? "arrowUp" : "arrowDown",
              text: `⚡ Signal ${signal.type || "BUY"}`,
              size: 2,
            },
          ];

          if (bestExitCandle && bestExitCandle.time !== bestEntryCandle.time) {
            const exitPosition = isWin
              ? (isBuy ? "aboveBar" : "belowBar")
              : (isBuy ? "belowBar" : "aboveBar");

            const pipText = signal.pips !== null && signal.pips !== undefined
              ? ` (${signal.pips >= 0 ? "+" : ""}${signal.pips}p)`
              : "";

            markers.push({
              time: bestExitCandle.time as Time,
              position: exitPosition,
              color: isWin ? "#10b981" : "#f43f5e",
              shape: isWin ? "circle" : "square",
              text: isWin ? `🎯 ${hitLevelLabel} HIT${pipText}` : `🛑 SL HIT`,
              size: 2,
            });
          }

          createSeriesMarkers(candlestickSeries, markers);
          chart.timeScale().fitContent();
        }
      })
      .catch((err) => {
        console.error("Failed to load candlesticks:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // 6. Handle Window Resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [signal, height]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-[#060A12] shadow-2xl">
      {/* Chart Top Bar with Live Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-base font-black tracking-wider text-white">
            {signal.symbol}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wider ${
              signal.type?.toUpperCase().includes("BUY")
                ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30"
                : "bg-rose-400/10 text-rose-300 border border-rose-400/30"
            }`}
          >
            {signal.type}
          </span>
          <span className="text-xs text-slate-400">
            {signal.channel_name?.replace("Fence - ", "") || "Fence VIP"}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {signal.pips !== null && signal.pips !== undefined && (
            <div className="flex items-center gap-1.5 font-mono font-bold">
              <span className="text-slate-400">Resultat:</span>
              <span className={signal.pips >= 0 ? "text-emerald-300" : "text-rose-300"}>
                {signal.pips >= 0 ? `+${signal.pips}` : signal.pips} Pips
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 font-mono font-bold">
            <span className="text-slate-400">R:R:</span>
            <span className="text-cyan-300">{signal.rr_ratio ? `1:${signal.rr_ratio}` : "1:1"} RR</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono uppercase tracking-widest text-[10px]">
              TradingView {dataSource ? `· ${dataSource}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div className="relative w-full" style={{ height: `${height}px` }}>
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#060A12]/80 backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <p className="mt-3 font-mono text-xs text-cyan-200">Laster historiske lysestaker...</p>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>

      {/* Chart Legend / Controls Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 bg-white/[0.01] px-4 py-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#38bdf8]" /> Entry
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#10b981]" /> TP3 (1:1 RR Mål)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#f43f5e]" /> SL (1:1 Risiko)
          </span>
        </div>
        <div className="text-[10px] text-slate-500">
          💡 Rull med musen for å zoome · Dra for å panorere
        </div>
      </div>
    </div>
  );
}
