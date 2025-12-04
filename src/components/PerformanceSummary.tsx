"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Target, DollarSign, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type Signal = {
    id: number;
    status: string;
    pips: number;
    profit?: number;
};

export function PerformanceSummary() {
    const [stats, setStats] = useState({
        winRate: 0,
        totalPips: 0,
        totalProfit: 0,
        totalSignals: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch("/api/signals");
                const data: Signal[] = await res.json();

                if (Array.isArray(data)) {
                    const closedSignals = data.filter(s => s.status === "TP_HIT" || s.status === "SL_HIT" || s.status === "CLOSED");
                    const wins = closedSignals.filter(s => s.status === "TP_HIT").length;
                    const losses = closedSignals.filter(s => s.status === "SL_HIT").length;
                    const totalClosed = wins + losses; // Ignore "CLOSED" for winrate if neutral

                    const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : 0;
                    const totalPips = data.reduce((acc, s) => acc + (s.pips || 0), 0);
                    const totalProfit = data.reduce((acc, s) => acc + (s.profit || 0), 0);

                    setStats({
                        winRate,
                        totalPips,
                        totalProfit,
                        totalSignals: data.length
                    });
                }
            } catch (error) {
                console.error("Failed to fetch stats:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
        const interval = setInterval(fetchStats, 30000); // Update every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="h-32 animate-pulse bg-muted/20 rounded-xl" />;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
                title="Win Rate"
                value={`${stats.winRate.toFixed(1)}%`}
                icon={<Target className="w-5 h-5 text-primary" />}
                trend="High Accuracy"
                color="text-primary"
            />
            <StatCard
                title="Total Pips"
                value={`+${stats.totalPips.toLocaleString()}`}
                icon={<Activity className="w-5 h-5 text-accent" />}
                trend="All Time"
                color="text-accent"
            />
            <StatCard
                title="Total Profit"
                value={`$${stats.totalProfit.toLocaleString()}`}
                icon={<DollarSign className="w-5 h-5 text-green-500" />}
                trend="Based on $1k Risk"
                color="text-green-500"
            />
        </div>
    );
}

function StatCard({ title, value, icon, trend, color }: { title: string, value: string, icon: React.ReactNode, trend: string, color: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-xl bg-card/50 backdrop-blur-md border border-border hover:border-primary/30 transition-all shadow-lg"
        >
            <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground font-medium">{title}</span>
                <div className={cn("p-2 rounded-lg bg-background/50", color.replace("text-", "bg-").replace("500", "500/10"))}>
                    {icon}
                </div>
            </div>
            <div className="space-y-1">
                <h3 className={cn("text-3xl font-bold tracking-tight", color)}>{value}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {trend}
                </p>
            </div>
        </motion.div>
    );
}
