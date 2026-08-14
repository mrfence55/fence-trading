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
  const [tradeDates, setTradeDates] = useState<{ open: string; close: string }>({ open: "", close: "" });

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Initialize TradingView Chart
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
        scaleMargins: {
          top: 0.18,
          bottom: 0.18,
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

    // 3. Fetch Candles from API
    const isBuy = signal.type?.toUpperCase().includes("BUY") || signal.type?.toUpperCase().includes("LONG");
    const isWin = signal.status?.includes("TP") || (signal.pips !== null && signal.pips !== undefined && signal.pips > 0);
    
    const defaultEntry = signal.symbol?.includes("BTC") ? 64000 : signal.symbol?.includes("XAU") ? 2450 : 1.285;
    const entryPrice = signal.entry || defaultEntry;
    const targetTp = signal.tp2 || signal.tp1 || (isBuy ? entryPrice * 1.015 : entryPrice * 0.985);
    const targetSl = signal.sl || (isBuy ? entryPrice * 0.99 : entryPrice * 1.01);

    const queryParams = new URLSearchParams({
      symbol: signal.symbol || "XAUUSD",
      type: signal.type || "BUY",
      openTime: signal.open_time || signal.timestamp || "",
      closeTime: signal.timestamp || "",
      status: signal.status || "TP_HIT",
      entry: entryPrice.toString(),
      tp: targetTp.toString(),
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

          if (data.candles[0] && data.candles[data.candles.length - 1]) {
            setTradeDates({
              open: formatUnixTime(data.openTimeSec || data.candles[0].time),
              close: formatUnixTime(data.closeTimeSec || data.candles[data.candles.length - 1].time),
            });
          }

          // 4. Add Entry, TP and SL Price Lines with precise styling
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

          if (signal.tp1) {
            candlestickSeries.createPriceLine({
              price: signal.tp1,
              color: "#10b981",
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              axisLabelVisible: true,
              title: `TP1: ${signal.tp1}`,
            });
          }

          if (signal.tp2) {
            candlestickSeries.createPriceLine({
              price: signal.tp2,
              color: "#059669",
              lineWidth: 2,
              lineStyle: LineStyle.Solid,
              axisLabelVisible: true,
              title: `TP2: ${signal.tp2}`,
            });
          }

          if (targetSl) {
            candlestickSeries.createPriceLine({
              price: targetSl,
              color: "#f43f5e",
              lineWidth: 2,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: true,
              title: `SL: ${targetSl}`,
            });
          }

          // 5. Add Interactive Markers by matching closest real timestamps
          const targetOpenSec = data.openTimeSec || (data.candles[Math.min(8, data.candles.length - 1)].time);
          const targetCloseSec = data.closeTimeSec || (data.candles[data.candles.length - 1].time);

          let bestEntryCandle = data.candles[0];
          let minEntryDiff = Infinity;
          let bestExitCandle = data.candles[data.candles.length - 1];
          let minExitDiff = Infinity;

          for (const c of data.candles) {
            const entryDiff = Math.abs(c.time - targetOpenSec);
            if (entryDiff < minEntryDiff) {
              minEntryDiff = entryDiff;
              bestEntryCandle = c;
            }
            const exitDiff = Math.abs(c.time - targetCloseSec);
            if (exitDiff < minExitDiff) {
              minExitDiff = exitDiff;
              bestExitCandle = c;
            }
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

          // Ensure exit marker is distinct from entry
          if (bestExitCandle.time !== bestEntryCandle.time) {
            markers.push({
              time: bestExitCandle.time as Time,
              position: isBuy ? "aboveBar" : "belowBar",
              color: isWin ? "#10b981" : "#f43f5e",
              shape: isWin ? "circle" : "square",
              text: isWin ? `🎯 TP${signal.tp_level || 2} HIT` : `🛑 SL HIT`,
              size: 2,
            });
          } else if (data.candles.length > 2) {
            const lastCandle = data.candles[data.candles.length - 2];
            markers.push({
              time: lastCandle.time as Time,
              position: isBuy ? "aboveBar" : "belowBar",
              color: isWin ? "#10b981" : "#f43f5e",
              shape: isWin ? "circle" : "square",
              text: isWin ? `🎯 TP${signal.tp_level || 2} HIT` : `🛑 SL HIT`,
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
          {signal.rr_ratio ? (
            <div className="flex items-center gap-1.5 font-mono font-bold">
              <span className="text-slate-400">R:R:</span>
              <span className="text-cyan-300">1:{signal.rr_ratio}</span>
            </div>
          ) : null}
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
            <span className="h-2 w-2 rounded-full bg-[#10b981]" /> Take Profit
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#f43f5e]" /> Stop Loss
          </span>
        </div>
        <div className="text-[10px] text-slate-500">
          💡 Rull med musen for å zoome · Dra for å panorere
        </div>
      </div>
    </div>
  );
}

function formatUnixTime(sec: number): string {
  if (!sec) return "";
  const d = new Date(sec * 1000);
  return d.toLocaleDateString("no-NO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
