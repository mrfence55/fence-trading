"use client";

import { TrendingUp, Target, BarChart3, PieChart } from "lucide-react";

export function PerformanceStats() {
    return (
        <div className="space-y-8 max-w-5xl mx-auto mt-8">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    label="Total Pips Gained"
                    value="+12,450"
                    subtext="All Time"
                    icon={<TrendingUp className="w-6 h-6 text-primary" />}
                    highlight
                />
                <StatCard
                    label="Win Rate"
                    value="88%"
                    subtext="Last 30 Days"
                    icon={<Target className="w-6 h-6 text-green-500" />}
                />
                <StatCard
                    label="Active Trades"
                    value="12"
                    subtext="Currently Running"
                    icon={<BarChart3 className="w-6 h-6 text-accent" />}
                />
            </div>

            {/* TP Hit Distribution */}
            <div className="bg-card border border-border rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                    <PieChart className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-bold text-foreground">Target Hit Distribution</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <TPBar label="TP1 Hit" percent={95} color="bg-green-500" />
                    <TPBar label="TP2 Hit" percent={72} color="bg-primary" />
                    <TPBar label="TP3 Hit" percent={45} color="bg-accent" />
                    <TPBar label="TP4 Hit" percent={15} color="bg-purple-500" />
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, subtext, icon, highlight }: { label: string, value: string, subtext: string, icon: React.ReactNode, highlight?: boolean }) {
    return (
        <div className={`bg-card border p-6 rounded-2xl flex flex-col items-center text-center transition-all hover:scale-[1.02] ${highlight ? 'border-primary/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]' : 'border-border'}`}>
            <div className="mb-4 p-3 bg-background rounded-full border border-border">
                {icon}
            </div>
            <div className={`text-4xl font-bold mb-2 ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</div>
            <div className="text-sm font-medium text-muted-foreground">{label}</div>
            <div className="text-xs text-foreground/70 mt-3 font-medium bg-muted px-3 py-1 rounded-full">
                {subtext}
            </div>
        </div>
    );
}

function TPBar({ label, percent, color }: { label: string, percent: number, color: string }) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-foreground">{percent}%</span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}
