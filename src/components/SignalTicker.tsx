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
        <div className="w-full bg-primary/5 border-y border-primary/10 overflow-hidden py-3 relative">
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />

            <div className="flex">
                <motion.div
                    initial={{ x: 0 }}
                    animate={{ x: "-50%" }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="flex gap-8 px-4 whitespace-nowrap"
                >
                    {[...MOCK_SIGNALS, ...MOCK_SIGNALS, ...MOCK_SIGNALS].map((signal, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 bg-card border border-border px-4 py-2 rounded-full shadow-sm"
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
                            <span className="text-muted-foreground text-sm border-l border-border pl-3">
                                {signal.result}
                            </span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
