"use client";

import { motion } from "framer-motion";
import { TrendingUp, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_SIGNALS = [
    { pair: "XAUUSD", type: "BUY", result: "+80 Pips", tp: "TP3 Hit" },
    { pair: "US30", type: "SELL", result: "+150 Pips", tp: "TP4 Hit" },
    { pair: "GBPUSD", type: "BUY", result: "+40 Pips", tp: "TP2 Hit" },
    { pair: "NAS100", type: "SELL", result: "+120 Pips", tp: "TP3 Hit" },
    { pair: "EURUSD", type: "SELL", result: "+25 Pips", tp: "TP1 Hit" },
    { pair: "BTCUSD", type: "BUY", result: "+500 Pips", tp: "TP4 Hit" },
];

export function SignalTicker() {
    return (
        <div className="w-full bg-background/50 backdrop-blur-md border-y border-primary/10 overflow-hidden py-3 relative">
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />

            <div className="container mx-auto px-4 mb-2 flex items-center gap-2">
                <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </div>
                <span className="text-xs font-bold tracking-wider text-red-500 uppercase">Live Signals</span>
            </div>

            <div className="flex">
                <motion.div
                    initial={{ x: 0 }}
                    animate={{ x: "-50%" }}
                    transition={{
                        duration: 30,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="flex gap-8 px-4 whitespace-nowrap"
                >
                    {[...MOCK_SIGNALS, ...MOCK_SIGNALS, ...MOCK_SIGNALS].map((signal, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 bg-card/40 backdrop-blur-sm border border-white/5 px-4 py-2 rounded-full shadow-sm hover:border-primary/20 transition-colors"
                        >
                            <span className="font-bold text-foreground">{signal.pair}</span>
                            <span className={cn(
                                "text-xs font-bold px-2 py-0.5 rounded",
                                signal.type === "BUY" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                            )}>
                                {signal.type}
                            </span>
                            <span className="flex items-center gap-1 text-primary font-semibold">
                                <CheckCircle2 className="w-3 h-3" />
                                {signal.tp}
                            </span>
                            <span className="text-muted-foreground text-sm border-l border-white/10 pl-3">
                                {signal.result}
                            </span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
