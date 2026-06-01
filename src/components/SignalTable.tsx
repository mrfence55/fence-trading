"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type Signal = {
  id: number;
  symbol: string;
  type: string;
  status: string;
  pips: number;
  tp_level: number;
  timestamp: string;
  channel_name?: string;
  rr_ratio?: number;
  profit?: number;
  open_time?: string;
};

interface SignalTableProps {
  signals: Signal[];
  activeChannel: string;
  onChannelChange: (channel: string) => void;
}

const CHANNELS = ["All", "Fence - Aurora", "Fence - Odin", "Fence - Main", "Fence - Crypto", "Fence - Live / Indices"];

export function SignalTable({ signals, activeChannel, onChannelChange }: SignalTableProps) {
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
          <table className="w-full min-w-[980px] text-left text-sm">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredSignals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#8B9EC7]">
                    Ingen signaler registrert for valgt filter.
                  </td>
                </tr>
              ) : (
                filteredSignals.map((signal) => (
                  <motion.tr
                    key={signal.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="transition-colors hover:bg-cyan-300/[.035]"
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
                        <Badge status={signal.status} />
                        <TPIndicators level={signal.tp_level || 0} />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-[#EEF2F8]">
                      {signal.rr_ratio ? `${signal.rr_ratio.toFixed(2)}R` : "-"}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-4 text-right font-mono font-black",
                        (signal.profit || 0) > 0
                          ? "text-emerald-300"
                          : (signal.profit || 0) < 0
                            ? "text-red-300"
                            : "text-[#8B9EC7]"
                      )}
                    >
                      {signal.profit
                        ? `${signal.profit > 0 ? "+" : ""}$${signal.profit.toLocaleString("no-NO", {
                            maximumFractionDigits: 0,
                          })}`
                        : "-"}
                    </td>
                  </motion.tr>
                ))
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

function Badge({ status }: { status: string }) {
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
      {status.replace("_", " ")}
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
