"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BarChart2 } from "lucide-react";

export type Signal = {
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
  max_tp_level?: number | null;
  max_rr_ratio?: number | null;
  max_profit?: number | null;
  timestamp: string;
  channel_name?: string;
  rr_ratio?: number | null;
  profit?: number | null;
  open_time?: string;
};

interface SignalTableProps {
  signals: Signal[];
  activeChannel: string;
  onChannelChange: (channel: string) => void;
  onSelectSignal?: (signal: Signal) => void;
}

const CHANNELS = ["All", "Fence - Aurora", "Fence - Odin", "Fence - Main", "Fence - Crypto", "Fence - Live / Indices"];

export function SignalTable({ signals, activeChannel, onChannelChange, onSelectSignal }: SignalTableProps) {
  const filteredSignals =
    activeChannel === "All"
      ? signals
      : signals.filter((signal) => (signal.channel_name || "Unknown") === activeChannel);

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CHANNELS.map((channel) => (
          <button
            key={channel}
            type="button"
            onClick={() => onChannelChange(channel)}
            className={cn(
              "whitespace-nowrap rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[.08em] transition-all",
              activeChannel === channel
                ? "border-cyan-300 bg-cyan-300 text-black shadow-[0_0_24px_rgba(6,182,212,.28)]"
                : "border-white/10 bg-white/[.035] text-[#8B9EC7] hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-white"
            )}
          >
            {channel === "All" ? "Alle" : channel.replace("Fence - ", "")}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#080D16]/90 shadow-[0_30px_100px_rgba(0,0,0,.28)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[.035] text-[11px] font-black uppercase tracking-[.12em] text-[#8B9EC7]">
              <tr>
                <th className="px-4 py-4">Åpnet</th>
                <th className="px-4 py-4">Oppdatert</th>
                <th className="px-4 py-4">Kanal</th>
                <th className="px-4 py-4">Symbol</th>
                <th className="px-4 py-4">Retning</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-right">RR</th>
                <th className="px-4 py-4 text-right">Resultat</th>
                <th className="px-4 py-4 text-center">Trade Replay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredSignals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-[#8B9EC7]">
                    Ingen signaler registrert for valgt filter.
                  </td>
                </tr>
              ) : (
                filteredSignals.map((signal) => {
                  const maxTpLevel = getMaxTpLevel(signal);

                  return (
                    <motion.tr
                      key={signal.id}
                      data-signal-id={signal.id}
                      data-tp-level={maxTpLevel}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => onSelectSignal?.(signal)}
                      className="cursor-pointer transition-colors hover:bg-cyan-300/[.05]"
                    >
                      <td className="px-4 py-4 font-mono text-xs text-[#8B9EC7]">
                        {formatDate(signal.open_time)}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-[#8B9EC7]">
                        {formatDate(signal.timestamp)}
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-[#8B9EC7]">
                        {signal.channel_name || "Unknown"}
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-base font-black text-white">{signal.symbol}</span>
                      </td>
                      <td className="px-4 py-4">
                        <Direction type={signal.type} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <Badge signal={signal} />
                          <TPIndicators level={maxTpLevel} />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-[#EEF2F8]">
                        <RRCell signal={signal} />
                      </td>
                      <td className="px-4 py-4 text-right font-mono">
                        <ResultCell signal={signal} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          aria-label={`Se chart for ${signal.symbol} signal ${signal.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSignal?.(signal);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300 transition hover:border-cyan-400 hover:bg-cyan-400/20"
                        >
                          <BarChart2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Se chart</span>
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value.endsWith("Z") || value.includes("+") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("no-NO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Direction({ type }: { type: string }) {
  const normalized = type.toUpperCase();
  const isLong = normalized === "LONG" || normalized === "BUY";

  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2.5 py-1 text-[11px] font-black uppercase tracking-[.12em]",
        isLong ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"
      )}
    >
      {isLong ? "LONG" : "SHORT"}
    </span>
  );
}

function Badge({ signal }: { signal: Signal }) {
  const status = getReportStatus(signal);
  const maxTpLevel = getMaxTpLevel(signal);
  const statusLabel =
    status === "TP_HIT" && maxTpLevel > 0
      ? `TP${maxTpLevel} HIT`
      : status.replace("_", " ");
  const color =
    status === "TP_HIT"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : status === "SL_HIT"
        ? "border-red-400/20 bg-red-400/10 text-red-300"
        : status === "CLOSED" || status === "BREAKEVEN"
          ? "border-white/15 bg-white/[.04] text-[#8B9EC7]"
          : "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";

  return (
    <span className={cn("w-fit rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[.08em]", color)}>
      {statusLabel}
    </span>
  );
}

function TPIndicators({ level }: { level: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4].map((tp) => (
        <div
          key={tp}
          className={cn(
            "h-1.5 w-5 rounded-full transition-colors",
            level >= tp ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.45)]" : "bg-white/10"
          )}
          title={`TP${tp}`}
        />
      ))}
    </div>
  );
}

function RRCell({ signal }: { signal: Signal }) {
  const rr = toFiniteNumber(signal.rr_ratio);
  const maxR = toFiniteNumber(signal.max_rr_ratio);
  const reportStatus = getReportStatus(signal);
  const primaryR = reportStatus === "TP_HIT" ? maxR ?? (rr !== null && rr > 0 ? rr : null) : rr;

  return (
    <span className={cn("font-black", primaryR !== null && primaryR < 0 ? "text-red-300" : "text-[#EEF2F8]")}>
      {primaryR !== null ? `${primaryR.toFixed(2)}R` : "-"}
    </span>
  );
}

function ResultCell({ signal }: { signal: Signal }) {
  const profit = toFiniteNumber(signal.profit);
  const maxProfit = toFiniteNumber(signal.max_profit);
  const reportStatus = getReportStatus(signal);
  const primaryProfit = reportStatus === "TP_HIT" ? maxProfit ?? (profit !== null && profit > 0 ? profit : null) : profit;

  return (
    <span
      className={cn(
        "font-black",
        primaryProfit !== null && primaryProfit > 0
          ? "text-emerald-300"
          : primaryProfit !== null && primaryProfit < 0
            ? "text-red-300"
            : "text-[#8B9EC7]"
      )}
    >
      {primaryProfit !== null ? formatCurrency(primaryProfit) : "-"}
    </span>
  );
}

function getMaxTpLevel(signal: Signal) {
  const rawLevel = signal.max_tp_level ?? signal.tp_level ?? 0;
  return Math.min(4, Math.max(0, Math.round(Number(rawLevel) || 0)));
}

function getReportStatus(signal: Signal) {
  return signal.status === "SL_HIT" && getMaxTpLevel(signal) > 0 ? "TP_HIT" : signal.status;
}

function toFiniteNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatCurrency(value: number) {
  return `${value > 0 ? "+" : ""}$${value.toLocaleString("no-NO", {
    maximumFractionDigits: 0,
  })}`;
}
