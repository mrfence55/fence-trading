"use client";

import { TrendingUp, Target, BarChart3, Activity } from "lucide-react";
import { Signal } from "./SignalTable";

interface PerformanceStatsProps {
    signals: Signal[];
    activeChannel: string;
}

export function PerformanceStats({ signals, activeChannel }: PerformanceStatsProps) {
    // Calculate stats
    const closedSignals = signals.filter(s => ["TP_HIT", "SL_HIT", "CLOSED", "BREAKEVEN"].includes(s.status));
    const wins = closedSignals.filter(s => s.status === "TP_HIT").length;
    const losses = closedSignals.filter(s => s.status === "SL_HIT").length;
    const meaningfulTrades = wins + losses;
    const winRate = meaningfulTrades > 0 ? ((wins / meaningfulTrades) * 100).toFixed(1) : "0.0";

    const totalPips = signals.reduce((acc, s) => acc + (s.pips || 0), 0);
    const activeTrades = signals.filter(s => !["TP_HIT", "SL_HIT", "CLOSED", "BREAKEVEN"].includes(s.status)).length;

    // TP distribution (simple counts)
    const tp1Count = signals.filter(s => s.tp_level >= 1).length;
    const tp2Count = signals.filter(s => s.tp_level >= 2).length;
    const tp3Count = signals.filter(s => s.tp_level >= 3).length;
    const tp4Count = signals.filter(s => s.tp_level >= 4).length;
    const totalTP = signals.filter(s => s.tp_level >= 1).length;

    return (
        <div className="space-y-8 max-w-6xl mx-auto mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Pips"
                    value={totalPips > 0 ? `+${totalPips}` : `${totalPips}`}
                    subtext={activeChannel === "All" ? "All Channels" : activeChannel}
                    icon={<TrendingUp className="w-6 h-6 text-primary" />}
                    highlight
                />
                <StatCard
                    label="Win Rate"
                    value={`${winRate}%`}
                    subtext="Excluding BE"
                    icon={<Target className="w-6 h-6 text-green-500" />}
                />
                <StatCard
                    label="Active Trades"
                    value={activeTrades.toString()}
                    subtext="Currently Running"
                    icon={<BarChart3 className="w-6 h-6 text-accent" />}
                />
                <StatCard
                    label="Total Signals"
                    value={signals.length.toString()}
                    subtext="Since Jan 12"
                    icon={<Activity className="w-6 h-6 text-purple-500" />}
                />
            </div>

            {/* Simple TP Distribution - No Recharts */}
            <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">Target Hit Distribution ({activeChannel})</h3>
                {totalTP > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <TPBar label="TP1+" count={tp1Count} total={totalTP} color="bg-green-500" />
                        <TPBar label="TP2+" count={tp2Count} total={totalTP} color="bg-cyan-500" />
                        <TPBar label="TP3+" count={tp3Count} total={totalTP} color="bg-amber-500" />
                        <TPBar label="TP4+" count={tp4Count} total={totalTP} color="bg-purple-500" />
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-8">No TP hits recorded for this period.</p>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, subtext, icon, highlight }: { label: string, value: string, subtext: string, icon: React.ReactNode, highlight?: boolean }) {
    return (
        <div className={`bg-card border p-6 rounded-2xl flex flex-row items-center gap-4 transition-all hover:scale-[1.02] ${highlight ? 'border-primary/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]' : 'border-border'}`}>
            <div className="p-3 bg-background rounded-full border border-border shrink-0">
                {icon}
            </div>
            <div className="flex-1">
                <div className={`text-2xl font-bold ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</div>
                <div className="text-sm font-medium text-muted-foreground">{label}</div>
            </div>
            <div className="text-xs text-foreground/70 font-medium bg-muted px-2 py-1 rounded-full">
                {subtext}
            </div>
        </div>
    );
}

function TPBar({ label, count, total, color }: { label: string, count: number, total: number, color: string }) {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-foreground font-medium">{label}</span>
                <span className="text-muted-foreground">{count} ({percentage}%)</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
            </div>
        </div>
    );
}
