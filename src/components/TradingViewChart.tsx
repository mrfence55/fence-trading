"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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

type CandlePoint = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type TakeProfitLine = {
  level: number;
  price: number;
  inferred: boolean;
};

type CandleSeriesApi = ReturnType<IChartApi["addSeries"]>;

const TP_COLORS: Record<number, string> = {
  1: "#86efac",
  2: "#34d399",
  3: "#10b981",
  4: "#2dd4bf",
};

export function TradingViewChart({ signal, height = 430 }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState("");
  const [chartMessage, setChartMessage] = useState("");

  const tradeMeta = useMemo(() => {
    const isBuy = isLongSignal(signal.type);
    const isWin = isWinningSignal(signal);
    const isLoss = isLosingSignal(signal);
    const reportedTpLevel = getReportedTpLevel(signal);
    const targetLabel = reportedTpLevel ? `TP${reportedTpLevel}` : isWin ? "TP" : "Target";
    const resultLabel =
      toFiniteNumber(signal.pips) !== null
        ? `${signal.pips! >= 0 ? "+" : ""}${signal.pips} Pips`
        : isWin
          ? "TP hit"
          : isLoss
            ? "SL hit"
            : "Aktiv";

    return {
      isBuy,
      isWin,
      isLoss,
      reportedTpLevel,
      targetLabel,
      resultLabel,
    };
  }, [signal]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#060A12" },
        textColor: "#94a3b8",
        fontSize: 12,
        fontFamily: "'Inter', sans-serif",
      },
      localization: {
        priceFormatter: (price: number) => formatPrice(price, getPriceDecimals(signal.symbol, price)),
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

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const queryEntry = resolveFallbackEntry(signal);
    const queryStop = resolveStopLoss(signal, queryEntry, tradeMeta.isBuy);
    const queryDecimals = getPriceDecimals(signal.symbol, queryEntry);
    const queryTargets = resolveTakeProfits(signal, queryEntry, queryStop, tradeMeta.isBuy, queryDecimals);
    const queryExitTarget = resolveExitTarget(queryTargets, signal, queryEntry, queryStop, tradeMeta.isBuy, queryDecimals);

    const queryParams = new URLSearchParams({
      symbol: signal.symbol || "XAUUSD",
      type: signal.type || "BUY",
      openTime: signal.open_time || signal.timestamp || "",
      closeTime: signal.timestamp || "",
      status: signal.status || "TP_HIT",
      entry: queryEntry.toString(),
      tp: (queryExitTarget?.price || queryEntry).toString(),
      sl: queryStop.toString(),
    });

    setIsLoading(true);
    setChartMessage("");
    setDataSource("");

    fetch(`/api/candles?${queryParams.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Candle API returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const candles = normalizeCandles(data.candles);
        if (candles.length === 0) {
          setChartMessage("Fant ikke candle-data for dette signalet.");
          return;
        }

        candlestickSeries.setData(
          candles.map((c) => ({
            time: c.time as Time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        );

        setDataSource(data.source || "");

        const targetOpenSec = data.openTimeSec || candles[Math.min(8, candles.length - 1)].time;
        const entryIndex = findNearestCandleIndex(candles, targetOpenSec);
        const entryCandle = candles[entryIndex];
        const entryPrice = toFiniteNumber(signal.entry) ?? entryCandle.close;
        const stopLoss = resolveStopLoss(signal, entryPrice, tradeMeta.isBuy);
        const decimals = getPriceDecimals(signal.symbol, entryPrice);
        const takeProfits = resolveTakeProfits(signal, entryPrice, stopLoss, tradeMeta.isBuy, decimals);
        const exitTarget = resolveExitTarget(takeProfits, signal, entryPrice, stopLoss, tradeMeta.isBuy, decimals);
        const primaryTarget = exitTarget || takeProfits[takeProfits.length - 1] || null;

        applyStableAutoScale(candlestickSeries, candles, [
          entryPrice,
          stopLoss,
          ...takeProfits.map((target) => target.price),
        ]);

        drawTradeLines(candlestickSeries, {
          entryPrice,
          stopLoss,
          takeProfits,
          primaryTarget,
          decimals,
          pips: toFiniteNumber(signal.pips),
        });

        const markers = buildMarkers({
          candles,
          entryIndex,
          entryCandle,
          signal,
          isBuy: tradeMeta.isBuy,
          isWin: tradeMeta.isWin,
          isLoss: tradeMeta.isLoss,
          stopLoss,
          takeProfits,
          primaryTarget,
        });

        createSeriesMarkers(candlestickSeries, markers);

        const exitIndex = findNearestCandleIndex(
          candles,
          Number(markers[markers.length - 1]?.time || entryCandle.time)
        );
        focusTradeWindow(chart, candles.length, entryIndex, exitIndex);
      })
      .catch((err) => {
        console.error("Failed to load candlesticks:", err);
        setChartMessage("Kunne ikke laste candle-data akkurat nå.");
      })
      .finally(() => {
        setIsLoading(false);
      });

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
      chart.remove();
      chartRef.current = null;
    };
  }, [signal, height, tradeMeta.isBuy, tradeMeta.isLoss, tradeMeta.isWin]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-[#060A12] shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-base font-black tracking-wider text-white">
            {signal.symbol}
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-black uppercase tracking-wider ${
              tradeMeta.isBuy
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-rose-400/30 bg-rose-400/10 text-rose-300"
            }`}
          >
            {tradeMeta.isBuy ? "LONG" : "SHORT"}
          </span>
          {tradeMeta.reportedTpLevel ? (
            <span className="rounded-full border border-teal-300/25 bg-teal-300/10 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-teal-200">
              TP{tradeMeta.reportedTpLevel} bekreftet
            </span>
          ) : null}
          <span className="text-xs text-slate-400">
            {signal.channel_name?.replace("Fence - ", "") || "Fence VIP"}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-mono font-bold">
            <span className="text-slate-400">Resultat:</span>
            <span className={tradeMeta.isLoss ? "text-rose-300" : "text-emerald-300"}>
              {tradeMeta.resultLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono font-bold">
            <span className="text-slate-400">R:R:</span>
            <span className="text-cyan-300">
              {signal.rr_ratio && signal.rr_ratio > 0 ? `1:${formatRatio(signal.rr_ratio)} RR` : "-"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-widest">
              TradingView {dataSource ? `· ${dataSource}` : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="relative w-full" style={{ height: `${height}px` }}>
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#060A12]/80 backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <p className="mt-3 font-mono text-xs text-cyan-200">Laster historiske lysestaker...</p>
          </div>
        )}
        {chartMessage && !isLoading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#060A12]/70 px-6 text-center">
            <p className="max-w-sm text-sm font-semibold text-slate-300">{chartMessage}</p>
          </div>
        ) : null}
        <div ref={chartContainerRef} className="h-full w-full" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 bg-white/[0.01] px-4 py-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#38bdf8]" /> Entry
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#2dd4bf]" /> {tradeMeta.targetLabel} hit
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#f43f5e]" /> SL
          </span>
        </div>
        <div className="text-[10px] text-slate-500">Zoom med musen · dra for å panorere</div>
      </div>
    </div>
  );
}

function normalizeCandles(value: unknown): CandlePoint[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((c: any) => ({
      time: Number(c.time),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
    }))
    .filter(
      (c) =>
        Number.isFinite(c.time) &&
        Number.isFinite(c.open) &&
        Number.isFinite(c.high) &&
        Number.isFinite(c.low) &&
        Number.isFinite(c.close)
    );
}

function drawTradeLines(
  series: CandleSeriesApi,
  {
    entryPrice,
    stopLoss,
    takeProfits,
    primaryTarget,
    decimals,
    pips,
  }: {
    entryPrice: number;
    stopLoss: number;
    takeProfits: TakeProfitLine[];
    primaryTarget: TakeProfitLine | null;
    decimals: number;
    pips: number | null;
  }
) {
  series.createPriceLine({
    price: entryPrice,
    color: "#38bdf8",
    lineWidth: 2,
    lineStyle: LineStyle.Dashed,
    axisLabelVisible: true,
    title: `ENTRY: ${formatPrice(entryPrice, decimals)}`,
  });

  series.createPriceLine({
    price: stopLoss,
    color: "#f43f5e",
    lineWidth: 2,
    lineStyle: LineStyle.Dashed,
    axisLabelVisible: true,
    title: `SL: ${formatPrice(stopLoss, decimals)}`,
  });

  takeProfits.forEach((target) => {
    const isPrimary = primaryTarget?.level === target.level;
    const pipText = isPrimary && pips !== null ? ` (${pips >= 0 ? "+" : ""}${pips}p)` : "";
    const inferredText = target.inferred ? " est." : "";

    series.createPriceLine({
      price: target.price,
      color: isPrimary ? "#2dd4bf" : TP_COLORS[target.level] || "#10b981",
      lineWidth: isPrimary ? 2 : 1,
      lineStyle: isPrimary ? LineStyle.Solid : LineStyle.Dotted,
      axisLabelVisible: isPrimary,
      title: isPrimary
        ? `TP${target.level} HIT: ${formatPrice(target.price, decimals)}${pipText}`
        : `TP${target.level}${inferredText}`,
    });
  });
}

function buildMarkers({
  candles,
  entryIndex,
  entryCandle,
  signal,
  isBuy,
  isWin,
  isLoss,
  stopLoss,
  takeProfits,
  primaryTarget,
}: {
  candles: CandlePoint[];
  entryIndex: number;
  entryCandle: CandlePoint;
  signal: TradeSignalData;
  isBuy: boolean;
  isWin: boolean;
  isLoss: boolean;
  stopLoss: number;
  takeProfits: TakeProfitLine[];
  primaryTarget: TakeProfitLine | null;
}): SeriesMarker<Time>[] {
  const markers: SeriesMarker<Time>[] = [
    {
      time: entryCandle.time as Time,
      position: isBuy ? "belowBar" : "aboveBar",
      color: "#38bdf8",
      shape: isBuy ? "arrowUp" : "arrowDown",
      text: `Signal ${isBuy ? "LONG" : "SHORT"}`,
      size: 2,
    },
  ];

  if (isWin) {
    const target = primaryTarget || takeProfits[takeProfits.length - 1] || null;
    const crossedCandle = target
      ? findFirstCrossing(candles, entryIndex + 1, target.price, isBuy, "target")
      : null;
    const exitCandle = crossedCandle || findExitByCloseTime(candles, signal.timestamp, entryIndex);

    if (exitCandle && exitCandle.time !== entryCandle.time) {
      const pips = toFiniteNumber(signal.pips);
      markers.push({
        time: exitCandle.time as Time,
        position: isBuy ? "aboveBar" : "belowBar",
        color: "#2dd4bf",
        shape: "circle",
        text: `${target ? `TP${target.level}` : "TP"} HIT${pips !== null ? ` (${pips >= 0 ? "+" : ""}${pips}p)` : ""}`,
        size: 2,
      });
    }

    return markers;
  }

  if (isLoss) {
    const exitCandle =
      findFirstCrossing(candles, entryIndex + 1, stopLoss, isBuy, "stop") ||
      findExitByCloseTime(candles, signal.timestamp, entryIndex);

    if (exitCandle && exitCandle.time !== entryCandle.time) {
      markers.push({
        time: exitCandle.time as Time,
        position: isBuy ? "belowBar" : "aboveBar",
        color: "#f43f5e",
        shape: "square",
        text: "SL HIT",
        size: 2,
      });
    }

    return markers;
  }

  const latestTarget = findLatestTouchedTarget(candles, entryIndex + 1, takeProfits, isBuy);
  if (latestTarget) {
    markers.push({
      time: latestTarget.candle.time as Time,
      position: isBuy ? "aboveBar" : "belowBar",
      color: "#10b981",
      shape: "circle",
      text: `TP${latestTarget.target.level} touched`,
      size: 1,
    });
  } else {
    const latestCandle = candles[candles.length - 1];
    if (latestCandle && latestCandle.time !== entryCandle.time) {
      markers.push({
        time: latestCandle.time as Time,
        position: isBuy ? "aboveBar" : "belowBar",
        color: "#38bdf8",
        shape: "circle",
        text: "Aktiv",
        size: 1,
      });
    }
  }

  return markers;
}

function applyStableAutoScale(series: CandleSeriesApi, candles: CandlePoint[], importantPrices: number[]) {
  const candlePrices = candles.flatMap((c) => [c.high, c.low]);
  const allPrices = [...candlePrices, ...importantPrices].filter((price) => Number.isFinite(price));

  if (allPrices.length < 2) return;

  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const padding = Math.max((max - min) * 0.12, Math.abs(max || 1) * 0.002);

  series.applyOptions({
    autoscaleInfoProvider: () => ({
      priceRange: {
        minValue: min - padding,
        maxValue: max + padding,
      },
    }),
  });
}

function focusTradeWindow(chart: IChartApi, candleCount: number, entryIndex: number, exitIndex: number) {
  if (candleCount <= 0) return;

  const from = Math.max(0, Math.min(entryIndex, exitIndex) - 10);
  const to = Math.min(candleCount - 1, Math.max(entryIndex, exitIndex) + 10);

  if (to - from >= 5) {
    chart.timeScale().setVisibleLogicalRange({ from, to });
  } else {
    chart.timeScale().fitContent();
  }
}

function resolveTakeProfits(
  signal: TradeSignalData,
  entryPrice: number,
  stopLoss: number,
  isBuy: boolean,
  decimals: number
): TakeProfitLine[] {
  const explicitTargets = [
    [1, toFiniteNumber(signal.tp1)],
    [2, toFiniteNumber(signal.tp2)],
    [3, toFiniteNumber(signal.tp3)],
    [4, toFiniteNumber(signal.tp4)],
  ] as const;

  const targets: TakeProfitLine[] = explicitTargets
    .filter(([, price]) => price !== null)
    .map(([level, price]) => ({ level, price: price!, inferred: false }));

  const reportedLevel = getReportedTpLevel(signal);
  const alreadyHasReportedLevel = reportedLevel ? targets.some((target) => target.level === reportedLevel) : true;

  if (reportedLevel && !alreadyHasReportedLevel) {
    const inferredPrice = inferTargetPrice(signal, entryPrice, stopLoss, isBuy, decimals, reportedLevel);
    if (inferredPrice !== null) {
      targets.push({ level: reportedLevel, price: inferredPrice, inferred: true });
    }
  }

  return targets
    .filter((target, index, list) => list.findIndex((item) => item.level === target.level) === index)
    .sort((a, b) => a.level - b.level);
}

function resolveExitTarget(
  targets: TakeProfitLine[],
  signal: TradeSignalData,
  entryPrice: number,
  stopLoss: number,
  isBuy: boolean,
  decimals: number
): TakeProfitLine | null {
  const reportedLevel = getReportedTpLevel(signal);
  if (reportedLevel) {
    const explicit = targets.find((target) => target.level === reportedLevel);
    if (explicit) return explicit;

    const inferredPrice = inferTargetPrice(signal, entryPrice, stopLoss, isBuy, decimals, reportedLevel);
    if (inferredPrice !== null) return { level: reportedLevel, price: inferredPrice, inferred: true };
  }

  if (targets.length > 0) return targets[targets.length - 1];

  const fallbackPrice = inferTargetPrice(signal, entryPrice, stopLoss, isBuy, decimals, 1);
  return fallbackPrice !== null ? { level: 1, price: fallbackPrice, inferred: true } : null;
}

function inferTargetPrice(
  signal: TradeSignalData,
  entryPrice: number,
  stopLoss: number,
  isBuy: boolean,
  decimals: number,
  targetLevel: number
) {
  const riskDistance = Math.abs(entryPrice - stopLoss);
  const rrRatio = toFiniteNumber(signal.rr_ratio);
  const pips = toFiniteNumber(signal.pips);
  let distance: number | null = null;

  if (rrRatio !== null && rrRatio > 0 && riskDistance > 0) {
    distance = riskDistance * rrRatio;
  } else if (pips !== null && Math.abs(pips) > 0) {
    distance = Math.abs(pips) * getPipValue(signal.symbol, entryPrice);
  } else if (riskDistance > 0) {
    distance = riskDistance * Math.max(1, targetLevel);
  }

  if (distance === null || !Number.isFinite(distance)) return null;
  return roundPrice(isBuy ? entryPrice + distance : entryPrice - distance, decimals);
}

function resolveStopLoss(signal: TradeSignalData, entryPrice: number, isBuy: boolean) {
  const explicitStop = toFiniteNumber(signal.sl);
  if (explicitStop !== null) return explicitStop;

  const rrRatio = toFiniteNumber(signal.rr_ratio);
  const pips = toFiniteNumber(signal.pips);
  if (rrRatio !== null && rrRatio > 0 && pips !== null && Math.abs(pips) > 0) {
    const riskDistance = (Math.abs(pips) * getPipValue(signal.symbol, entryPrice)) / rrRatio;
    return roundPrice(isBuy ? entryPrice - riskDistance : entryPrice + riskDistance, getPriceDecimals(signal.symbol, entryPrice));
  }

  return roundPrice(entryPrice * (isBuy ? 0.99 : 1.01), getPriceDecimals(signal.symbol, entryPrice));
}

function resolveFallbackEntry(signal: TradeSignalData) {
  const explicitEntry = toFiniteNumber(signal.entry);
  if (explicitEntry !== null) return explicitEntry;

  const symbol = signal.symbol?.toUpperCase() || "";
  if (symbol.includes("BTC")) return 64000;
  if (symbol.includes("ETH")) return 3200;
  if (symbol.includes("XAU")) return 2450;
  if (symbol.includes("US30")) return 39000;
  if (symbol.includes("NAS") || symbol.includes("US100")) return 19000;
  if (symbol.includes("JPY")) return 155;
  return 1.285;
}

function resolveRiskReward(
  signal: TradeSignalData,
  entryPrice: number,
  stopLoss: number,
  targetPrice: number | null
) {
  const explicitRatio = toFiniteNumber(signal.rr_ratio);
  if (explicitRatio !== null && explicitRatio > 0) return explicitRatio;
  if (targetPrice === null) return null;

  const risk = Math.abs(entryPrice - stopLoss);
  if (risk <= 0) return null;
  return Math.abs(targetPrice - entryPrice) / risk;
}

function findNearestCandleIndex(candles: CandlePoint[], timeSec: number) {
  let bestIndex = 0;
  let bestDiff = Infinity;

  candles.forEach((candle, index) => {
    const diff = Math.abs(candle.time - timeSec);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function findFirstCrossing(
  candles: CandlePoint[],
  startIndex: number,
  price: number,
  isBuy: boolean,
  mode: "target" | "stop"
) {
  for (let i = Math.max(0, startIndex); i < candles.length; i += 1) {
    const candle = candles[i];
    const touched =
      mode === "target"
        ? isBuy
          ? candle.high >= price
          : candle.low <= price
        : isBuy
          ? candle.low <= price
          : candle.high >= price;

    if (touched) return candle;
  }

  return null;
}

function findLatestTouchedTarget(
  candles: CandlePoint[],
  startIndex: number,
  targets: TakeProfitLine[],
  isBuy: boolean
) {
  let latest: { candle: CandlePoint; target: TakeProfitLine } | null = null;
  const orderedTargets = [...targets].sort((a, b) => b.level - a.level);

  for (let i = Math.max(0, startIndex); i < candles.length; i += 1) {
    for (const target of orderedTargets) {
      const touched = isBuy ? candles[i].high >= target.price : candles[i].low <= target.price;
      if (touched) {
        latest = { candle: candles[i], target };
        break;
      }
    }
  }

  return latest;
}

function findExitByCloseTime(candles: CandlePoint[], timestamp: string | undefined, entryIndex: number) {
  const closeTime = parseChartTime(timestamp);
  if (!closeTime) return candles[Math.min(candles.length - 1, entryIndex + 4)] || null;
  return candles[findNearestCandleIndex(candles, Math.floor(closeTime / 1000))] || null;
}

function parseChartTime(value?: string) {
  if (!value) return 0;
  const date = new Date(
    value.endsWith("Z") || value.includes("+")
      ? value
      : value.includes("T")
        ? `${value}Z`
        : `${value.replace(" ", "T")}Z`
  );
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getReportedTpLevel(signal: TradeSignalData) {
  const explicitLevel = toFiniteNumber(signal.tp_level);
  if (explicitLevel !== null && explicitLevel > 0) {
    return Math.min(4, Math.max(1, Math.round(explicitLevel)));
  }

  const match = signal.status?.match(/TP\s*([1-4])/i);
  return match ? Number(match[1]) : null;
}

function isWinningSignal(signal: TradeSignalData) {
  const status = signal.status?.toUpperCase() || "";
  const pips = toFiniteNumber(signal.pips);
  return status.includes("TP") || (pips !== null && pips > 0);
}

function isLosingSignal(signal: TradeSignalData) {
  const status = signal.status?.toUpperCase() || "";
  const pips = toFiniteNumber(signal.pips);
  return status.includes("SL") || (pips !== null && pips < 0);
}

function isLongSignal(type?: string) {
  const normalized = type?.toUpperCase() || "";
  return normalized.includes("BUY") || normalized.includes("LONG");
}

function toFiniteNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getPriceDecimals(symbol: string | undefined, price: number) {
  const normalized = symbol?.toUpperCase() || "";
  if (normalized.includes("JPY")) return 3;
  if (normalized.length === 6 && price < 10) return 5;
  if (normalized.includes("XAU")) return 2;
  if (price >= 100) return 2;
  if (price >= 10) return 3;
  return 5;
}

function getPipValue(symbol: string | undefined, price: number) {
  const normalized = symbol?.toUpperCase() || "";
  if (normalized.includes("BTC") || normalized.includes("ETH") || normalized.includes("XAU") || price >= 100) return 1;
  if (normalized.includes("JPY")) return 0.01;
  return 0.0001;
}

function roundPrice(value: number, decimals: number) {
  return Number(value.toFixed(decimals));
}

function formatPrice(value: number, decimals: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals >= 3 ? 3 : 2,
    maximumFractionDigits: decimals,
  });
}

function formatRatio(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
