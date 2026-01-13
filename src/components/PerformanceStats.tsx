"use client";

import { TrendingUp, Target, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { Signal } from "./SignalTable";
import dynamic from "next/dynamic";

// Dynamically import the chart component with SSR disabled
const TargetDistributionChart = dynamic(
    () => import("./TargetDistributionChart"),
    {
        ssr: false,
        loading: () => (
            <div className="h-full flex items-center justify-center text-muted-foreground animate-pulse">
                Loading chart...
            </div>
        )
    }
);

interface PerformanceStatsProps {
    signals: Signal[];
    activeChannel: string;
}

export function PerformanceStats({ signals, activeChannel }: PerformanceStatsProps) {
    // Calculate stats
    const closedSignals = signals.filter(s => ["TP_HIT", "SL_HIT", "CLOSED", "BREAKEVEN"].includes(s.status));
    const wins = closedSignals.filter(s => s.status === "TP_HIT").length;

    // Counting SL as loss.
    const losses = closedSignals.filter(s => s.status === "SL_HIT").length;
    const meaningfulTrades = wins + losses;
    const winRate = meaningfulTrades > 0 ? ((wins / meaningfulTrades) * 100).toFixed(1) : "0.0";

    const totalPips = signals.reduce((acc, s) => acc + (s.pips || 0), 0);
    const activeTrades = signals.filter(s => !["TP_HIT", "SL_HIT", "CLOSED", "BREAKEVEN"].includes(s.status)).length;

    return (
        <div className="space-y-8 max-w-6xl mx-auto mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Metrics Column */}
                <div className="space-y-4">
                    <StatCard
                        label="Total Pips Gained"
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
                </div>

                {/* Pie Chart Component - Client Side Only */}
                <TargetDistributionChart signals={signals} activeChannel={activeChannel} />
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
            {/* Optional badge style for subtext if needed, or simple text */}
            <div className="text-xs text-foreground/70 font-medium bg-muted px-2 py-1 rounded-full">
                {subtext}
            </div>
        </div>
    );
}
