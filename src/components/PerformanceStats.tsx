"use client";

import { BarChart3, PieChart, Target, TrendingUp } from "lucide-react";
import { Signal } from "./SignalTable";

interface PerformanceStatsProps {
  signals: Signal[];
  activeChannel: string;
}

const CLOSED_STATUSES = ["TP_HIT", "SL_HIT", "CLOSED", "BREAKEVEN"];

export function PerformanceStats({ signals, activeChannel }: PerformanceStatsProps) {
  const closedSignals = signals.filter((signal) => CLOSED_STATUSES.includes(signal.status));
  const wins = closedSignals.filter((signal) => signal.status === "TP_HIT").length;
  const losses = closedSignals.filter((signal) => signal.status === "SL_HIT").length;
  const meaningfulTrades = wins + losses;
  const winRate = meaningfulTrades > 0 ? ((wins / meaningfulTrades) * 100).toFixed(1) : "0.0";

  const totalPips = signals.reduce((acc, signal) => acc + (signal.pips || 0), 0);
  const formattedPips = Number.isInteger(totalPips) ? totalPips.toLocaleString("no-NO") : totalPips.toFixed(1);
  const activeTrades = signals.filter((signal) => !CLOSED_STATUSES.includes(signal.status)).length;

  const tp1Count = signals.filter((signal) => signal.tp_level >= 1).length;
  const tp2Count = signals.filter((signal) => signal.tp_level >= 2).length;
  const tp3Count = signals.filter((signal) => signal.tp_level >= 3).length;
  const tp4Count = signals.filter((signal) => signal.tp_level >= 4).length;
  const totalTP = signals.filter((signal) => signal.tp_level >= 1).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Totale pips"
          value={`${totalPips > 0 ? "+" : ""}${formattedPips}`}
          subtext={activeChannel === "All" ? "Alle kanaler" : activeChannel}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="cyan"
        />
        <StatCard
          label="Winrate"
          value={`${winRate}%`}
          subtext="Ekskl. breakeven"
          icon={<Target className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label="Aktive trades"
          value={activeTrades.toString()}
          subtext="Overvåkes nå"
          icon={<BarChart3 className="h-5 w-5" />}
          tone="gold"
        />
        <StatCard
          label="Totale signaler"
          value={signals.length.toString()}
          subtext="Siden 2025"
          icon={<PieChart className="h-5 w-5" />}
          tone="purple"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 backdrop-blur-xl">
        <div className="mb-5 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-black tracking-tight text-white">Target-fordeling</h3>
            <p className="text-sm text-[#8B9EC7]">{activeChannel === "All" ? "Alle kanaler" : activeChannel}</p>
          </div>
          <span className="font-mono text-xs font-bold text-[#8B9EC7]">{totalTP} signaler med TP-treff</span>
        </div>

        {totalTP > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <TPBar label="TP1+" count={tp1Count} total={totalTP} color="bg-emerald-400" />
            <TPBar label="TP2+" count={tp2Count} total={totalTP} color="bg-cyan-400" />
            <TPBar label="TP3+" count={tp3Count} total={totalTP} color="bg-[#D4AF37]" />
            <TPBar label="TP4+" count={tp4Count} total={totalTP} color="bg-violet-400" />
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#060A12]/70 p-8 text-center text-sm text-[#8B9EC7]">
            Ingen TP-treff registrert for valgt filter ennå.
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  icon,
  tone,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  tone: "cyan" | "green" | "gold" | "purple";
}) {
  const tones = {
    cyan: "border-cyan-400/25 text-cyan-300 shadow-[0_0_40px_rgba(6,182,212,.08)]",
    green: "border-emerald-400/25 text-emerald-300 shadow-[0_0_40px_rgba(16,185,129,.07)]",
    gold: "border-[#D4AF37]/25 text-[#D4AF37] shadow-[0_0_40px_rgba(212,175,55,.07)]",
    purple: "border-violet-400/25 text-violet-300 shadow-[0_0_40px_rgba(139,92,246,.07)]",
  };

  return (
    <div className={`rounded-2xl border bg-[rgba(15,24,38,.72)] p-5 backdrop-blur-xl ${tones[tone]}`}>
      <div className="mb-5 flex items-center justify-between">
        <div className="rounded-xl border border-current/20 bg-current/10 p-3">{icon}</div>
        <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_16px_currentColor]" />
      </div>
      <div className="font-mono text-3xl font-black text-white">{value}</div>
      <div className="mt-2 text-sm font-bold text-[#EEF2F8]">{label}</div>
      <div className="mt-3 w-fit rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs font-bold text-[#8B9EC7]">
        {subtext}
      </div>
    </div>
  );
}

function TPBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-white/10 bg-[#060A12]/60 p-4">
      <div className="mb-3 flex justify-between gap-3 text-sm">
        <span className="font-black text-white">{label}</span>
        <span className="font-mono text-[#8B9EC7]">{count} ({percentage}%)</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
