"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Signal = {
    id: number;
    symbol: string;
    type: string;
    status: string;
    pips: number;
    tp_level: number;
    timestamp: string;
};

export function SignalTable() {
    const [signals, setSignals] = useState<Signal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSignals() {
            try {
                const res = await fetch("/api/signals");
                const data = await res.json();
                if (Array.isArray(data)) {
                    setSignals(data);
                }
            } catch (error) {
                console.error("Failed to fetch signals:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchSignals();
        // Poll every 10 seconds for new data
        const interval = setInterval(fetchSignals, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <div className="text-center p-8 text-muted-foreground">Loading performance data...</div>;
    }

    return (
        <div className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                        <tr>
                            <th className="px-4 py-3">Time (UTC)</th>
                            <th className="px-4 py-3">Symbol</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">TP Level</th>
                            <th className="px-4 py-3 text-right">Pips</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {signals.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                    No signals recorded yet.
                                </td>
                            </tr>
                        ) : (
                            signals.map((signal) => (
                                <motion.tr
                                    key={signal.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="hover:bg-muted/30 transition-colors"
                                >
                                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                        {new Date(signal.timestamp + "Z").toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-foreground">{signal.symbol}</td>
                                    <td className={cn(
                                        "px-4 py-3 font-semibold",
                                        signal.type.toUpperCase() === "LONG" ? "text-green-500" : "text-red-500"
                                    )}>
                                        {signal.type.toUpperCase()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge status={signal.status} />
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {signal.tp_level > 0 ? `TP${signal.tp_level}` : "-"}
                                    </td>
                                    <td className={cn(
                                        "px-4 py-3 text-right font-mono font-bold",
                                        signal.pips > 0 ? "text-green-500" : "text-red-500"
                                    )}>
                                        {signal.pips > 0 ? "+" : ""}{signal.pips}
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Badge({ status }: { status: string }) {
    let color = "bg-gray-500/10 text-gray-500";
    if (status === "TP_HIT") color = "bg-green-500/10 text-green-500";
    if (status === "SL_HIT") color = "bg-red-500/10 text-red-500";
    if (status === "CLOSED") color = "bg-blue-500/10 text-blue-500";

    return (
        <span className={cn("px-2 py-1 rounded-full text-xs font-bold", color)}>
            {status.replace("_", " ")}
        </span>
    );
}
