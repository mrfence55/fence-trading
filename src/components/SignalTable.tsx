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
    isLoading?: boolean;
}

export function SignalTable({ signals, activeChannel, onChannelChange, isLoading = false }: SignalTableProps) {
    // Fixed channel list as requested
    const channels = [
        "Fence - Aurora",
        "Fence - Odin",
        "Fence - Main",
        "Fence - Crypto",
        "Fence - Live" // Utilizing "Live" (capitalized) as probable DB match, label can be adjusted if needed
    ];

    // Filter signals: 
    // 1. Must match active channel
    // 2. Must be from Jan 12, 2026 or later (timestamp >= '2026-01-12')
    const filteredSignals = signals.filter(s => {
        // Date filter
        // Assuming timestamp is ISO string or YYYY-MM-DD format start
        // 12.01.2026 -> "2026-01-12"
        const isRecent = s.timestamp >= "2026-01-12";

        // Channel filter
        // Mapping "Fence - Live" to potential DB variations if needed, 
        // but strict matching for now based on request.
        // If activeChannel is one of the list, we filter by it.
        const matchesChannel = (s.channel_name || "Unknown") === activeChannel;

        return isRecent && matchesChannel;
    });

    if (isLoading) {
        return <div className="text-center p-8 text-muted-foreground">Loading performance data...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Channel Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {channels.map(channel => (
                    <button
                        key={channel}
                        onClick={() => onChannelChange(channel)}
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                            activeChannel === channel
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                    >
                        {channel}
                    </button>
                ))}
            </div>

            <div className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                            <tr>
                                <th className="px-4 py-3">Open Time</th>
                                <th className="px-4 py-3">Hit Time</th>
                                <th className="px-4 py-3">Channel</th>
                                <th className="px-4 py-3">Symbol</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">RR</th>
                                <th className="px-4 py-3 text-right">Profit ($1k Risk)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredSignals.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                                        No signals recorded for {activeChannel} since Jan 12, 2026.
                                    </td>
                                </tr>
                            ) : (
                                filteredSignals.map((signal) => (
                                    <motion.tr
                                        key={signal.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="hover:bg-muted/30 transition-colors"
                                    >
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                            {signal.open_time ? new Date(signal.open_time).toLocaleString() : "-"}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                            {new Date(signal.timestamp + "Z").toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            {signal.channel_name || "Unknown"}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-foreground">{signal.symbol}</td>
                                        <td className={cn(
                                            "px-4 py-3 font-semibold",
                                            signal.type.toUpperCase() === "LONG" ? "text-green-500" : "text-red-500"
                                        )}>
                                            {signal.type.toUpperCase()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <Badge status={signal.status} />
                                                <TPIndicators level={signal.tp_level} />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            {signal.rr_ratio ? `1:${signal.rr_ratio.toFixed(2)}` : "-"}
                                        </td>
                                        <td className={cn(
                                            "px-4 py-3 text-right font-mono font-bold",
                                            (signal.profit || 0) > 0 ? "text-green-500" :
                                                (signal.profit || 0) < 0 ? "text-red-500" : "text-gray-500" // Grey for 0
                                        )}>
                                            {signal.profit
                                                ? (signal.profit > 0 ? "+" : "") + "$" + signal.profit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
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

function Badge({ status }: { status: string }) {
    let color = "bg-gray-500/10 text-gray-500";
    if (status === "TP_HIT") color = "bg-green-500/10 text-green-500";
    if (status === "SL_HIT") color = "bg-red-500/10 text-red-500";
    if (status === "CLOSED" || status === "BREAKEVEN") color = "bg-gray-500/10 text-gray-400"; // Grey for BE/Closed

    return (
        <span className={cn("px-2 py-1 rounded-full text-xs font-bold w-fit", color)}>
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
                        "h-1.5 w-4 rounded-full transition-colors",
                        level >= tp ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-muted-foreground/20"
                    )}
                    title={`TP${tp}`}
                />
            ))}
        </div>
    );
}
