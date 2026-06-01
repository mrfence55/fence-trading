"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, BarChart3, RefreshCw, ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react";
import { PerformanceStats } from "@/components/PerformanceStats";
import { Signal, SignalTable } from "@/components/SignalTable";

const CLOSED_STATUSES = ["TP_HIT", "SL_HIT", "CLOSED", "BREAKEVEN"];

function formatNumber(value: number, suffix = "") {
  return `${Math.round(value).toLocaleString("no-NO")}${suffix}`;
}

export default function PerformancePage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [activeChannel, setActiveChannel] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function fetchSignals() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/signals", { cache: "no-store" });
      if (!response.ok) throw new Error("Kunne ikke hente signalhistorikk.");

      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Uventet respons fra signal-API.");

      const startDate = new Date("2025-01-01T00:00:00");
      const validSignals = data.filter((signal: Signal) => {
        const signalDate = new Date(signal.timestamp || signal.open_time || "");
        return signalDate >= startDate;
      });

      setSignals(validSignals);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Kunne ikke hente signalhistorikk.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchSignals();
  }, []);

  const visibleSignals = useMemo(
    () =>
      activeChannel === "All"
        ? signals
        : signals.filter((signal) => (signal.channel_name || "Unknown") === activeChannel),
    [activeChannel, signals]
  );

  const overview = useMemo(() => {
    const closed = visibleSignals.filter((signal) => CLOSED_STATUSES.includes(signal.status));
    const wins = closed.filter((signal) => signal.status === "TP_HIT").length;
    const losses = closed.filter((signal) => signal.status === "SL_HIT").length;
    const meaningful = wins + losses;
    const totalPips = visibleSignals.reduce((sum, signal) => sum + (signal.pips || 0), 0);
    const profit = visibleSignals.reduce((sum, signal) => sum + (signal.profit || 0), 0);
    const active = visibleSignals.filter((signal) => !CLOSED_STATUSES.includes(signal.status)).length;
    const winrate = meaningful > 0 ? (wins / meaningful) * 100 : 0;
    const latest = visibleSignals[0];

    return { active, closed: closed.length, latest, profit, totalPips, winrate };
  }, [visibleSignals]);

  return (
    <div className="min-h-screen overflow-hidden bg-[#060A12] text-[#EEF2F8]">
      <style dangerouslySetInnerHTML={{ __html: `
        body {
          background: #060A12;
        }
        body::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: .38;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
        }
        .ft-shell {
          position: relative;
          z-index: 1;
        }
        .ft-nav {
          position: fixed;
          inset: 0 0 auto 0;
          z-index: 50;
          transition: background .25s ease, box-shadow .25s ease, backdrop-filter .25s ease;
        }
        .ft-nav.scrolled {
          background: rgba(6, 10, 18, .88);
          backdrop-filter: blur(24px) saturate(150%);
          box-shadow: 0 1px 0 rgba(255,255,255,.05), 0 16px 60px rgba(0,0,0,.34);
        }
        .ft-logo-box {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #06B6D4, #0369A1);
          box-shadow: 0 0 28px rgba(6,182,212,.34);
        }
        .ft-grid-floor {
          position: absolute;
          left: 0;
          right: 0;
          top: 260px;
          height: 360px;
          pointer-events: none;
          transform: perspective(700px) rotateX(62deg);
          transform-origin: top center;
          background:
            linear-gradient(to bottom, rgba(6,10,18,0), #060A12 82%),
            repeating-linear-gradient(90deg, rgba(6,182,212,.055) 0, rgba(6,182,212,.055) 1px, transparent 1px, transparent 82px),
            repeating-linear-gradient(0deg, rgba(212,175,55,.04) 0, rgba(212,175,55,.04) 1px, transparent 1px, transparent 82px);
        }
        .ft-orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(110px);
          pointer-events: none;
        }
        .ft-orb.cyan {
          width: 640px;
          height: 640px;
          right: -230px;
          top: -220px;
          background: radial-gradient(circle, rgba(6,182,212,.12), transparent 70%);
        }
        .ft-orb.gold {
          width: 520px;
          height: 520px;
          left: -190px;
          top: 360px;
          background: radial-gradient(circle, rgba(212,175,55,.08), transparent 70%);
        }
        .ft-glass {
          background: rgba(15,24,38,.72);
          border: 1px solid rgba(255,255,255,.07);
          backdrop-filter: blur(20px) saturate(140%);
          box-shadow: 0 28px 90px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.05);
        }
        .ft-gradient-text {
          background: linear-gradient(125deg, #38BDF8 0%, #06B6D4 35%, #D4AF37 78%, #F59E0B 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .ft-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border-radius: 9px;
          font-weight: 800;
          transition: transform .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease;
        }
        .ft-btn:hover {
          transform: translateY(-1px);
        }
      ` }} />

      <header className={`ft-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="mx-auto flex h-[70px] max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-3 font-black tracking-tight">
            <span className="ft-logo-box">
              <TrendingUp className="h-5 w-5 text-white" strokeWidth={2.7} />
            </span>
            <span className="text-lg">
              Fence<span className="text-[#06B6D4]">Trading</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="ft-btn border border-white/10 bg-white/[.04] px-4 py-2 text-xs text-[#EEF2F8] hover:border-cyan-400/35 hover:bg-cyan-400/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Forside
            </Link>
            <button
              type="button"
              onClick={() => void fetchSignals()}
              disabled={isLoading}
              className="ft-btn bg-cyan-400 px-4 py-2 text-xs text-black shadow-[0_0_32px_rgba(6,182,212,.28)] hover:bg-cyan-300 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Oppdater
            </button>
          </div>
        </div>
      </header>

      <main className="ft-shell">
        <div className="ft-orb cyan" />
        <div className="ft-orb gold" />
        <div className="ft-grid-floor" />

        <section className="mx-auto max-w-6xl px-5 pb-10 pt-32 md:pb-16 md:pt-40">
          <div className="grid gap-8 lg:grid-cols-[1.08fr_.92fr] lg:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[.16em] text-cyan-300">
                <Activity className="h-3.5 w-3.5" />
                Live Performance
              </div>
              <h1 className="max-w-4xl text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
                Resultater som kan <span className="ft-gradient-text">etterprøves</span>.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#8B9EC7] md:text-lg">
                Signalhistorikken oppdateres direkte fra Fence-boten. Her ser du åpne handler, TP-nivåer, SL, RR og resultat per kanal.
              </p>
            </div>

            <div className="ft-glass rounded-2xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.14em] text-[#8B9EC7]">Siste status</p>
                  <p className="mt-1 text-xl font-black text-white">
                    {overview.latest?.symbol || "Venter på signaler"}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-300">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <HeroMetric label="Pips" value={`${overview.totalPips >= 0 ? "+" : ""}${formatNumber(overview.totalPips)}`} tone="cyan" />
                <HeroMetric label="Winrate" value={`${overview.winrate.toFixed(1)}%`} tone="green" />
                <HeroMetric label="Aktive" value={overview.active.toString()} tone="gold" />
                <HeroMetric label="$1k risk" value={`${overview.profit >= 0 ? "+" : ""}$${formatNumber(overview.profit)}`} tone="purple" />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl space-y-8 px-5 pb-20">
          {error && (
            <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <PerformanceStats signals={visibleSignals} activeChannel={activeChannel} />

          <div className="ft-glass rounded-2xl p-4 md:p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[.16em] text-[#D4AF37]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Signal logg
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">Alle trades per kanal</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8B9EC7]">
                  Filteret oppdaterer både KPI-ene og loggen. Nye signaler kommer inn via `/api/signals`.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-3 py-2 text-xs font-bold text-[#8B9EC7]">
                <BarChart3 className="h-4 w-4 text-cyan-300" />
                {visibleSignals.length} viste signaler
              </div>
            </div>

            <SignalTable signals={signals} activeChannel={activeChannel} onChannelChange={setActiveChannel} />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#080D16] py-7">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 text-xs text-[#8B9EC7] md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Fence Trading. Alle rettigheter forbeholdt.</p>
          <p>Resultater er historiske og garanterer ikke fremtidig avkastning.</p>
        </div>
      </footer>
    </div>
  );
}

function HeroMetric({ label, value, tone }: { label: string; value: string; tone: "cyan" | "green" | "gold" | "purple" }) {
  const tones = {
    cyan: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",
    green: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
    gold: "text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/20",
    purple: "text-violet-300 bg-violet-400/10 border-violet-400/20",
  };

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[.14em] opacity-75">{label}</p>
      <p className="mt-1 font-mono text-xl font-black text-white">{value}</p>
    </div>
  );
}
