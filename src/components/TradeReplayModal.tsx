"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, Target, ShieldAlert, Clock, Sparkles, ExternalLink } from "lucide-react";
import { TradingViewChart, TradeSignalData } from "./TradingViewChart";

interface TradeReplayModalProps {
  signal: TradeSignalData | null;
  isOpen: boolean;
  onClose: () => void;
}

const affiliateUrl =
  process.env.NEXT_PUBLIC_TRADENATION_AFFILIATE_URL ||
  "https://go.tradenation.com/visit/?bta=36145&brand=tradenation";

export function TradeReplayModal({ signal, isOpen, onClose }: TradeReplayModalProps) {
  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!signal) return null;

  const isBuy = signal.type?.toUpperCase().includes("BUY") || signal.type?.toUpperCase().includes("LONG");
  const isWin = signal.status?.includes("TP") || (signal.pips !== null && signal.pips !== undefined && signal.pips > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
          />

          {/* Modal Content Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
            className="relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-[#080D16] p-6 text-[#EEF2F8] shadow-[0_25px_80px_rgba(0,0,0,0.85)] max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_24px_rgba(6,182,212,0.35)]">
                  {isBuy ? (
                    <TrendingUp className="h-6 w-6 text-slate-950" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-slate-950" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                      {signal.symbol} Trade Replay
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-xs font-bold text-cyan-300">
                      <Sparkles className="h-3 w-3" /> Verifisert
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Kanal: <strong className="text-slate-200">{signal.channel_name || "Fence VIP"}</strong> · Tidspunkt:{" "}
                    <span className="font-mono">{formatDate(signal.open_time || signal.timestamp)}</span>
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Lukk"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Metrics Ribbon */}
            <div className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Inngang (Entry)</p>
                <p className="mt-1 font-mono text-base font-black text-cyan-300">
                  {signal.entry || "Markedsordre"}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                <div className="mt-1 flex items-center justify-center gap-1">
                  {isWin ? (
                    <Target className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-rose-400" />
                  )}
                  <span className={`font-mono text-sm font-black ${isWin ? "text-emerald-300" : "text-rose-300"}`}>
                    {signal.status.replace("_", " ")}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gevinst / Pips</p>
                <p className={`mt-1 font-mono text-base font-black ${signal.pips && signal.pips >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {signal.pips === null || signal.pips === undefined ? "Aktiv" : `${signal.pips >= 0 ? "+" : ""}${signal.pips} Pips`}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Risk / Reward</p>
                <p className="mt-1 font-mono text-base font-black text-amber-300">
                  {signal.rr_ratio ? `1:${signal.rr_ratio} RR` : "1:1 RR"}
                </p>
              </div>
            </div>

            {/* Embedded TradingView Lightweight Chart */}
            <div className="flex-1 overflow-hidden">
              <TradingViewChart signal={signal} height={380} />
            </div>

            {/* Modal Bottom Call to Action */}
            <div className="mt-5 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-4 sm:flex-row">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="h-4 w-4 text-cyan-400" />
                <span>Trade-historikk bekreftet i sanntids signal-database</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  Lukk graf
                </button>
                <a
                  href={affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition hover:bg-cyan-200"
                >
                  Bli med i Fence VIP
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function formatDate(value?: string) {
  if (!value) return "Nylig";
  const date = new Date(value.endsWith("Z") || value.includes("+") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return "Nylig";

  return date.toLocaleString("no-NO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
