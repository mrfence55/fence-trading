"use client";

import { TrendingUp, Target, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Signal } from "./SignalTable";

interface PerformanceStatsProps {
    signals: Signal[];
    activeChannel: string;
}

export function PerformanceStats({ signals, activeChannel }: PerformanceStatsProps) {
    // Calculate stats
    const closedSignals = signals.filter(s => ["TP_HIT", "SL_HIT", "CLOSED", "BREAKEVEN"].includes(s.status));
    const wins = closedSignals.filter(s => s.status === "TP_HIT").length;
    // Treating Breakeven as neutral, not a loss? Or as a non-win. 
    // Usually Win Rate = Wins / (Wins + Losses).
    // If we count SL as loss.
    const losses = closedSignals.filter(s => s.status === "SL_HIT").length;
    const meaningfulTrades = wins + losses;
    const winRate = meaningfulTrades > 0 ? ((wins / meaningfulTrades) * 100).toFixed(1) : "0.0";

    const totalPips = signals.reduce((acc, s) => acc + (s.pips || 0), 0);
    const activeTrades = signals.filter(s => !["TP_HIT", "SL_HIT", "CLOSED", "BREAKEVEN"].includes(s.status)).length;

    // Pie Chart Data
    // Counting highest TP level hit
    const tpCounts = {
        TP1: signals.filter(s => s.tp_level >= 1).length,
        TP2: signals.filter(s => s.tp_level >= 2).length,
        TP3: signals.filter(s => s.tp_level >= 3).length,
        TP4: signals.filter(s => s.tp_level >= 4).length,
    };

    // However, a pie chart usually shows distribution of *final* outcomes.
    // If TP4 is hit, TP1-3 were also hit.
    // A "Cake diagram" for TP hits might mean: "How many reached TP1 vs TP2 vs TP3 vs TP4".
    // Or it might mean "What was the final result?".
    // Given the previous static bar chart showed "TP1 Hit 95%", "TP2 Hit 72%", etc. (cumulative).
    // A Pie chart is PARTIONAL using 100%. 
    // User asked for "cake diagram with the reported tp's 1-4+".
    // Maybe they want breakdown of highest TP reached?
    // e.g. Reached TP1 (but not 2), Reached TP2 (but not 3)...
    // I will calculate "Highest TP Reached".

    // Logic: 
    // If tp_level == 4 -> TP4
    // If tp_level == 3 -> TP3
    // ...
    // But this depends on data integrity.

    const pieData = [
        { name: 'TP 1', value: signals.filter(s => s.tp_level === 1).length, color: '#22c55e' }, // Green
        { name: 'TP 2', value: signals.filter(s => s.tp_level === 2).length, color: '#06b6d4' }, // Cyan
        { name: 'TP 3', value: signals.filter(s => s.tp_level === 3).length, color: '#f59e0b' }, // Amber
        { name: 'TP 4+', value: signals.filter(s => s.tp_level >= 4).length, color: '#a855f7' }, // Purple
    ].filter(d => d.value > 0);

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

                {/* Pie Chart */}
                <div className="bg-card border border-border rounded-2xl p-6 flex flex-col col-span-1 md:col-span-2 lg:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                        <PieChartIcon className="w-6 h-6 text-primary" />
                        <h3 className="text-xl font-bold text-foreground">Target Hit Distribution ({activeChannel})</h3>
                    </div>

                    <div className="flex-1 min-h-[300px] w-full">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                                        itemStyle={{ color: '#e2e8f0' }}
                                    />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                No TP hits recorded for this period.
                            </div>
                        )}
                    </div>
                </div>
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
