"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

const affiliateUrl =
  process.env.NEXT_PUBLIC_TRADENATION_AFFILIATE_URL ||
  "https://go.tradenation.com/visit/?bta=36145&brand=tradenation";

interface Signal {
  id: number;
  symbol: string;
  type: string;
  status: string;
  pips: number | null;
  tp_level: number | null;
  timestamp?: string;
  open_time?: string;
  channel_name?: string;
}

const TICKS = [
  { sym: "XAUUSD", dir: "LONG", tp: "TP3", pips: "+80" },
  { sym: "US30", dir: "SHORT", tp: "TP4", pips: "+150" },
  { sym: "GBPUSD", dir: "LONG", tp: "TP2", pips: "+40" },
  { sym: "NAS100", dir: "SHORT", tp: "TP3", pips: "+120" },
  { sym: "EURUSD", dir: "SHORT", tp: "TP1", pips: "+25" },
  { sym: "BTCUSD", dir: "LONG", tp: "TP4", pips: "+500" },
  { sym: "ETHUSD", dir: "LONG", tp: "TP2", pips: "+180" },
  { sym: "SPX500", dir: "LONG", tp: "TP3", pips: "+95" },
];

const FAQS = [
  {
    q: "Er det virkelig gratis?",
    a: "Ja, 100% gratis. Vi tjener som affiliate når du registrerer deg hos Trade Nation via vår link. Du betaler ingenting ekstra, og spreads/vilkår forblir de samme.",
  },
  {
    q: "Hva slags signaler sender dere?",
    a: "Vi dekker Forex (XAUUSD, GBPUSD, EURUSD), indekser (US30, NAS100) og krypto (BTCUSD) gjennom våre 5 kanaler. Hvert signal har nøyaktig inngangspris, stop loss og opptil 4 take profit-nivåer.",
  },
  {
    q: "Hva er copy trading og hvordan fungerer det?",
    a: "Copy trading betyr at alle handler vi tar automatisk plasseres og kopieres til din egen meglerkonto i sanntid. Du setter det opp én gang på 20 minutter, og deretter skjer alt passivt. Krever Pro-plan.",
  },
  {
    q: "Hvor mye kapital trenger jeg for å starte?",
    a: "Vi anbefaler minimum $250–500 for en sunn og trygg handelsopplevelse. Med mulighet for mikro-lots kan du handle med svært lav risiko per posisjon mens du lærer.",
  },
  {
    q: "Garanterer dere profitt?",
    a: "Nei — og ingen seriøse aktører gjør det. Trading innebærer alltid risiko. Vår historikk viser over 120 000 pips levert, men historiske resultater er ingen garanti for fremtidig avkastning.",
  },
  {
    q: "Hvordan verifiserer jeg kontoen min?",
    a: "Etter registrering hos Trade Nation via vår lenke, går du til fencetrading.no/verify og sender inn navnet og e-posten du registrerte deg med. Vi godkjenner normalt innen 1–4 timer på hverdager.",
  },
];

function CountUp({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    const duration = 1600;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.floor(ease * value));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [value]);

  return <>{prefix}{current.toLocaleString("no-NO")}{suffix}</>;
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [allSignals, setAllSignals] = useState<Signal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<Signal[]>([]);
  const [activeChannel, setActiveChannel] = useState<string>("all");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [stats, setStats] = useState({
    pips: 120544,
    winrate: "74.2%",
    active: 0,
    total: 1817,
  });

  // Track if scroll event listener should update Nav bar state
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // IntersectionObserver for elements reveal animation
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("vis");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal, .reveal-l, .reveal-r").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [allSignals]);

  // Fetch signals on mount
  useEffect(() => {
    async function fetchSignals() {
      try {
        const res = await fetch("/api/signals", { cache: "no-store" });
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        if (Array.isArray(data)) {
          // Filter signals from Jan 1, 2025 onwards (or Jan 12, 2026 as per original design, let's keep all for complete stats)
          const cutoff = new Date("2025-01-01");
          const sigs = data.filter((s: any) => new Date(s.timestamp || s.open_time || "") >= cutoff);
          setAllSignals(sigs);

          // Calculate dynamic stats
          const totalPips = sigs.reduce((sum: number, s: any) => sum + (s.pips || 0), 0);
          const closed = sigs.filter((s: any) => ["TP_HIT", "SL_HIT"].includes(s.status));
          const wins = closed.filter((s: any) => s.status === "TP_HIT").length;
          const wr = closed.length > 0 ? ((wins / closed.length) * 100).toFixed(1) + "%" : "74.2%";
          const active = sigs.filter((s: any) => !["TP_HIT", "SL_HIT", "CLOSED", "BREAKEVEN"].includes(s.status)).length;

          setStats({
            pips: totalPips > 0 ? totalPips : 120544,
            winrate: wr,
            active: active,
            total: sigs.length > 0 ? sigs.length : 1817,
          });
        }
      } catch (e) {
        console.warn("Failed to load signals from API, loading fallback static data.", e);
        // Fallback static data
        const fallbackData: Signal[] = [
          { id: 1, symbol: "XAUUSD", type: "LONG", status: "TP_HIT", pips: 80, tp_level: 3, channel_name: "Fence - Aurora", open_time: "2026-05-15" },
          { id: 2, symbol: "US30", type: "SHORT", status: "TP_HIT", pips: 150, tp_level: 4, channel_name: "Fence - Live / Indices", open_time: "2026-05-15" },
          { id: 3, symbol: "BTCUSD", type: "LONG", status: "TP_HIT", pips: 500, tp_level: 4, channel_name: "Fence - Crypto", open_time: "2026-05-14" },
          { id: 4, symbol: "GBPUSD", type: "LONG", status: "OPEN", pips: null, tp_level: 0, channel_name: "Fence - Odin", open_time: "2026-05-15" },
          { id: 5, symbol: "NAS100", type: "SHORT", status: "TP_HIT", pips: 120, tp_level: 3, channel_name: "Fence - Main", open_time: "2026-05-14" },
          { id: 6, symbol: "EURUSD", type: "SHORT", status: "SL_HIT", pips: -25, tp_level: 0, channel_name: "Fence - Main", open_time: "2026-05-13" },
        ];
        setAllSignals(fallbackData);
      }
    }
    fetchSignals();
  }, []);

  // Filter signals based on selected channel badge
  useEffect(() => {
    if (activeChannel === "all") {
      setFilteredSignals(allSignals);
    } else {
      setFilteredSignals(allSignals.filter((s) => s.channel_name === activeChannel));
    }
  }, [allSignals, activeChannel]);

  // Card interactive mouse hover 3D tilt calculations
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setTilt({ rx: -y * 8, ry: x * 10 });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 });
  };

  const toggleFaq = (index: number) => {
    setOpenFaq((current) => (current === index ? null : index));
  };

  // Smooth scroll handler for anchor links
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    const target = document.querySelector(targetId);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#060A12] text-[#EEF2F8]">
      {/* Dynamic Embedded CSS Stylesheet for Pixel Perfect Landing Page */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --bg:       #060A12;
          --bg2:      #0A101C;
          --bg3:      #0F1826;
          --border:   rgba(255,255,255,0.06);
          --glow-c:   #06B6D4;
          --glow-a:   #D4AF37;
          --c:        #06B6D4;          /* cyan primary */
          --a:        #D4AF37;          /* gold accent */
          --g:        #10B981;          /* green */
          --r:        #EF4444;          /* red */
          --p:        #8B5CF6;          /* purple */
          --text:     #EEF2F8;
          --muted:    #8B9EC7;
          --faint:    #3D4F6E;
          --rad:      16px;
          --rad-sm:   9px;
          --rad-xl:   26px;
        }

        body::before {
          content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
          opacity: .4;
        }

        .mono { font-family: 'JetBrains Mono', monospace; }
        .text-c { color: var(--c); }
        .text-a { color: var(--a); }
        .text-g { color: var(--g); }
        .text-r { color: var(--r); }

        .gt {
          background: linear-gradient(125deg, #38BDF8 0%, #06B6D4 35%, #D4AF37 75%, #F59E0B 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          background-size: 200%; animation: gt-shift 6s ease infinite;
        }
        @keyframes gt-shift { 0%, 100% { background-position: 0% } 50% { background-position: 100% } }

        .sl {
          display: inline-flex; align-items: center; gap: 10px;
          font-size: 11px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: var(--c);
          margin-bottom: 18px;
        }
        .sl::before { content: ''; width: 28px; height: 1.5px; background: var(--c); border-radius: 2px; }

        .glass {
          background: rgba(10, 16, 28, 0.65);
          backdrop-filter: blur(20px) saturate(140%);
          border: 1px solid var(--border);
        }
        
        .card {
          background: rgba(15, 24, 38, 0.75);
          backdrop-filter: blur(16px) saturate(130%);
          border: 1px solid var(--border); border-radius: var(--rad);
          transition: border-color .3s, box-shadow .3s, transform .3s;
        }
        .card:hover {
          border-color: rgba(6, 182, 212, 0.22);
          box-shadow: 0 24px 80px rgba(6, 182, 212, 0.07), 0 0 0 1px rgba(6, 182, 212, 0.08) inset;
          transform: translateY(-2px);
        }

        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 9px;
          padding: 15px 30px; border-radius: var(--rad-sm); font-weight: 700; font-size: 15px;
          cursor: pointer; border: none; transition: all .2s; letter-spacing: -.01em;
        }
        .btn-p {
          background: linear-gradient(135deg, #22D3EE, #06B6D4); color: #000;
          box-shadow: 0 0 40px rgba(6, 182, 212, .3), 0 4px 20px rgba(6, 182, 212, .2);
        }
        .btn-p:hover { transform: translateY(-2px) scale(1.01); box-shadow: 0 0 60px rgba(6, 182, 212, .5), 0 8px 30px rgba(6, 182, 212, .25); }
        .btn-o {
          background: rgba(255, 255, 255, .04); color: var(--text);
          border: 1px solid var(--border); backdrop-filter: blur(12px);
        }
        .btn-o:hover { background: rgba(6, 182, 212, .08); border-color: rgba(6, 182, 212, .3); transform: translateY(-1px); }
        .btn-a {
          background: linear-gradient(135deg, #F0C040, #D4AF37); color: #000;
          box-shadow: 0 0 40px rgba(212, 175, 55, .25), 0 4px 20px rgba(212, 175, 55, .15);
        }
        .btn-a:hover { transform: translateY(-2px); box-shadow: 0 0 60px rgba(212, 175, 55, .4); }

        #nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          padding: 0; transition: background .4s, box-shadow .4s, backdrop-filter .4s;
        }
        #nav.scrolled {
          background: rgba(6, 10, 18, 0.88); backdrop-filter: blur(24px) saturate(150%);
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04), 0 4px 30px rgba(0, 0, 0, .4);
        }
        .nav-in { display: flex; align-items: center; justify-content: space-between; height: 70px; gap: 32px; }
        .nav-logo { display: flex; align-items: center; gap: 11px; font-weight: 900; font-size: 18px; letter-spacing: -.02em; }
        .logo-box {
          width: 38px; height: 38px; border-radius: 10px;
          background: linear-gradient(135deg, #06B6D4, #0369A1);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 24px rgba(6, 182, 212, .35);
          position: relative; overflow: hidden;
        }
        .logo-box::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,.15), transparent);
        }
        .logo-box svg { width: 21px; height: 21px; stroke: #fff; stroke-width: 2.5; fill: none; stroke-linecap: round; stroke-linejoin: round; }
        .logo-word span { color: var(--c); }
        .nav-links { display: flex; list-style: none; gap: 4px; }
        .nav-links a {
          padding: 8px 15px; border-radius: var(--rad-sm);
          font-size: 13.5px; font-weight: 500; color: var(--muted);
          transition: color .2s, background .2s;
        }
        .nav-links a:hover { color: var(--text); background: rgba(255, 255, 255, .05); }
        .live-pill {
          display: flex; align-items: center; gap: 7px;
          font-size: 11px; font-weight: 800; color: var(--r); letter-spacing: .1em; text-transform: uppercase;
        }
        .dot {
          width: 7px; height: 7px; border-radius: 50%; background: var(--r); flex-shrink: 0;
          animation: blink 1.4s ease infinite;
        }
        @keyframes blink { 0%, 100% { opacity: 1; transform: scale(1) } 50% { opacity: .5; transform: scale(.8) } }
        .nav-right { display: flex; align-items: center; gap: 12px; }

        .ticker-wrap {
          margin-top: 70px; height: 46px; overflow: hidden; position: relative;
          background: rgba(10, 16, 28, .85); border-bottom: 1px solid rgba(255, 255, 255, .05);
          backdrop-filter: blur(12px); z-index: 10;
        }
        .ticker-edge { position: absolute; top: 0; bottom: 0; width: 100px; z-index: 2; pointer-events: none; }
        .ticker-edge.l { left: 0; background: linear-gradient(to right, #060A12, transparent); }
        .ticker-edge.r { right: 0; background: linear-gradient(to left, #060A12, transparent); }
        .ticker-strip {
          display: flex; align-items: center; height: 100%;
          animation: scroll-tick 45s linear infinite; white-space: nowrap;
        }
        .ticker-strip:hover { animation-play-state: paused; }
        @keyframes scroll-tick { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        
        .tick {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 0 24px; font-size: 12.5px; border-right: 1px solid rgba(255, 255, 255, .05); flex-shrink: 0;
        }
        .tick-sym { font-weight: 800; font-size: 12px; letter-spacing: .05em; color: var(--text); }
        .tick-b { color: var(--g); font-size: 11px; font-weight: 800; letter-spacing: .08em; background: rgba(16, 185, 129, .1); padding: 2px 8px; border-radius: 4px; }
        .tick-s { color: var(--r); font-size: 11px; font-weight: 800; letter-spacing: .08em; background: rgba(239, 68, 68, .1); padding: 2px 8px; border-radius: 4px; }
        .tick-pips { font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 13px; color: var(--muted); }
        .tick-tp { font-size: 11px; font-weight: 700; color: var(--g); }

        #hero {
          min-height: 90vh; display: flex; flex-direction: column; justify-content: center;
          position: relative; overflow: hidden; padding: 60px 0 80px;
        }
        .hero-grid-floor {
          position: absolute; bottom: 0; left: 0; right: 0; height: 320px;
          background:
            linear-gradient(to top, var(--bg) 0%, transparent 100%),
            repeating-linear-gradient(90deg, rgba(6, 182, 212, .04) 0px, rgba(6, 182, 212, .04) 1px, transparent 1px, transparent 80px),
            repeating-linear-gradient(0deg, rgba(6, 182, 212, .04) 0px, rgba(6, 182, 212, .04) 1px, transparent 1px, transparent 80px);
          transform: perspective(600px) rotateX(60deg); transform-origin: bottom center;
          pointer-events: none;
        }

        .orb { position: absolute; border-radius: 50%; filter: blur(110px); pointer-events: none; will-change: transform; }
        .orb1 { width: 700px; height: 700px; background: radial-gradient(circle, rgba(6,182,212,.1), transparent 70%); top: -300px; right: -200px; animation: orb-a 9s ease-in-out infinite; }
        .orb2 { width: 600px; height: 600px; background: radial-gradient(circle, rgba(212,175,55,.07), transparent 70%); bottom: -200px; left: -180px; animation: orb-a 11s ease-in-out infinite reverse; }
        .orb3 { width: 350px; height: 350px; background: radial-gradient(circle, rgba(139,92,246,.06), transparent 70%); top: 45%; left: 40%; animation: orb-a 7s ease-in-out infinite 3s; }
        @keyframes orb-a { 0%, 100% { transform: translateY(0) scale(1) } 50% { transform: translateY(-40px) scale(1.06) } }

        .hero-layout { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 50px; align-items: center; }
        .hero-eye { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, rgba(212, 175, 55, .14), rgba(212, 175, 55, .04));
          border: 1px solid rgba(212, 175, 55, .28); border-radius: 999px;
          padding: 6px 16px; font-size: 11px; font-weight: 800; color: var(--a); letter-spacing: .08em; text-transform: uppercase;
        }
        .h1-sub { font-size: 18px; color: var(--muted); max-width: 520px; line-height: 1.72; margin: 22px 0 38px; }
        .hero-ctas { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 52px; }
        .hero-proof {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 0;
          border-top: 1px solid var(--border); padding-top: 32px;
        }
        .hp-item { padding: 0 20px 0 0; }
        .hp-item+.hp-item { padding-left: 20px; border-left: 1px solid var(--border); }
        .hp-num { font-size: 2.1rem; font-weight: 900; font-family: 'JetBrains Mono', monospace; color: var(--c); line-height: 1; }
        .hp-label { font-size: 12px; color: var(--muted); margin-top: 5px; font-weight: 500; }

        .card3d-wrap { position: relative; perspective: 1200px; }
        .card3d {
          background: rgba(12, 20, 34, 0.85); backdrop-filter: blur(24px) saturate(150%);
          border: 1px solid rgba(255, 255, 255, .09); border-radius: 24px;
          padding: 28px; transform-style: preserve-3d;
          transition: transform .1s ease-out;
          box-shadow:
            0 40px 100px rgba(0,0,0,.5),
            0 0 0 1px rgba(255,255,255,.04) inset,
            0 1px 0 rgba(255,255,255,.08) inset;
          will-change: transform;
        }
        .card3d::before {
          content: ''; position: absolute; inset: 0; border-radius: inherit;
          background: linear-gradient(135deg, rgba(255,255,255,.06) 0%, transparent 50%);
          pointer-events: none;
        }
        .card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
        .card-title { font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
        .live-tag {
          display: flex; align-items: center; gap: 6px; background: rgba(239, 68, 68, .1);
          border: 1px solid rgba(239, 68, 68, .25); border-radius: 999px; padding: 4px 12px;
          font-size: 11px; font-weight: 700; color: var(--r); letter-spacing: .06em;
        }
        
        .sig-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 13px 0; border-bottom: 1px solid rgba(255, 255, 255, .04);
          transform-style: preserve-3d;
        }
        .sig-row:last-child { border-bottom: none; }
        .sig-sym { font-weight: 800; font-size: 14px; letter-spacing: .04em; color: var(--text); }
        .sig-dir { padding: 3px 10px; border-radius: 5px; font-size: 10px; font-weight: 900; letter-spacing: .1em; }
        .buy { background: rgba(16, 185, 129, .12); color: var(--g); }
        .sell { background: rgba(239, 68, 68, .12); color: var(--r); }
        .sig-state { font-size: 12px; font-weight: 700; color: var(--c); }
        .sig-pip { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 14px; color: var(--g); }
        .sig-pip.live { color: var(--c); }

        .chip {
          position: absolute; background: rgba(12, 20, 34, .9); border: 1px solid rgba(255, 255, 255, .1);
          border-radius: 14px; padding: 13px 18px; display: flex; align-items: center; gap: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.04) inset;
          backdrop-filter: blur(20px); z-index: 2;
        }
        .chip-a { top: -24px; right: -32px; animation: chip-float 5s ease-in-out infinite; }
        .chip-b { bottom: -24px; left: -32px; animation: chip-float 6s ease-in-out infinite 2.5s; }
        @keyframes chip-float { 0%, 100% { transform: translateY(0) rotate(-.5deg) } 50% { transform: translateY(-10px) rotate(.5deg) } }
        .chip-ico { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .cig { background: rgba(16, 185, 129, .12); }
        .cia { background: rgba(212, 175, 55, .12); }
        .chip-num { font-size: 19px; font-weight: 900; font-family: 'JetBrains Mono', monospace; line-height: 1; }
        .chip-label { font-size: 10px; color: var(--muted); font-weight: 500; margin-top: 2px; letter-spacing: .04em; }

        #how { padding: 110px 0; background: var(--bg2); position: relative; overflow: hidden; }
        #how::before {
          content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 900px; height: 300px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(6, 182, 212, .04), transparent 70%);
          pointer-events: none;
        }
        .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 64px; position: relative; }
        .steps::before {
          content: ''; position: absolute; top: 68px; left: calc(12.5% + 20px); right: calc(12.5% + 20px);
          height: 1px; background: linear-gradient(to right, transparent, rgba(6, 182, 212, .3) 20%, rgba(6, 182, 212, .3) 80%, transparent);
          pointer-events: none; z-index: 0;
        }
        .step {
          padding: 30px 22px; border-radius: var(--rad); position: relative; z-index: 1;
          background: rgba(15, 24, 38, .6); border: 1px solid var(--border);
          transition: border-color .3s, box-shadow .3s, transform .3s;
        }
        .step:hover {
          border-color: rgba(6, 182, 212, .25); transform: translateY(-4px);
          box-shadow: 0 24px 60px rgba(6, 182, 212, .07);
        }
        .step-bg-num {
          position: absolute; top: -12px; right: 12px; font-size: 72px; font-weight: 900; font-family: 'JetBrains Mono', monospace;
          color: rgba(255, 255, 255, .025); line-height: 1; pointer-events: none; user-select: none;
        }
        .step-ico {
          width: 54px; height: 54px; border-radius: 15px; display: flex; align-items: center; justify-content: center;
          margin-bottom: 22px; position: relative;
        }
        .step-ico svg { width: 26px; height: 26px; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
        .sib { background: rgba(6, 182, 212, .1); box-shadow: 0 0 20px rgba(6, 182, 212, .15); }
        .sib svg { stroke: var(--c); }
        .sia { background: rgba(212, 175, 55, .1); box-shadow: 0 0 20px rgba(212, 175, 55, .12); }
        .sia svg { stroke: var(--a); }
        .sig { background: rgba(16, 185, 129, .1); box-shadow: 0 0 20px rgba(16, 185, 129, .12); }
        .sig svg { stroke: var(--g); }
        .sip { background: rgba(139, 92, 246, .1); box-shadow: 0 0 20px rgba(139, 92, 246, .12); }
        .sip svg { stroke: var(--p); }
        .step-dot {
          position: absolute; top: -7px; left: 50%; transform: translateX(-50%);
          width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--bg2); z-index: 2;
        }
        .step h3 { font-size: 16px; margin-bottom: 10px; }
        .step p { font-size: 13.5px; color: var(--muted); line-height: 1.65; }

        #performance { padding: 110px 0; }
        .perf-head { text-align: center; margin-bottom: 64px; }
        .perf-head p { color: var(--muted); font-size: 17px; max-width: 580px; margin: 14px auto 0; }
        
        .stats4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-bottom: 52px; }
        .s4card {
          padding: 28px 22px; border-radius: var(--rad); text-align: center;
          background: rgba(15, 24, 38, .7); border: 1px solid var(--border);
          position: relative; overflow: hidden; transition: border-color .3s, transform .3s;
        }
        .s4card::before {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
          opacity: 0; transition: opacity .3s;
        }
        .s4card.hl::before { background: linear-gradient(to right, var(--c), #38BDF8); opacity: 1; }
        .s4card:hover { transform: translateY(-3px); border-color: rgba(6, 182, 212, .18); }
        .s4ico { margin: 0 auto 16px; width: 48px; height: 48px; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
        .s4ico svg { width: 22px; height: 22px; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
        
        .s4num { font-size: 2.6rem; font-weight: 900; font-family: 'JetBrains Mono', monospace; line-height: 1; margin-bottom: 5px; }
        .s4label { font-size: 12.5px; color: var(--muted); font-weight: 500; margin-bottom: 8px; }
        .s4sub { font-size: 11px; font-weight: 600; padding: 3px 12px; border-radius: 999px; background: rgba(255, 255, 255, .04); color: var(--muted); display: inline-block; letter-spacing: .04em; }

        .signal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .sg-card {
          display: flex; align-items: center; gap: 16px; padding: 18px 20px;
          border-radius: var(--rad); background: rgba(15, 24, 38, .6); border: 1px solid var(--border);
          transition: border-color .25s, transform .25s;
        }
        .sg-card:hover { border-color: rgba(6, 182, 212, .2); transform: translateX(3px); }
        .sg-pair { font-size: 15px; font-weight: 800; letter-spacing: .04em; min-width: 72px; }
        .sg-time { font-size: 10px; color: var(--muted); margin-top: 3px; font-family: 'JetBrains Mono', monospace; }
        .sg-dir { padding: 4px 11px; border-radius: 6px; font-size: 10px; font-weight: 900; letter-spacing: .1em; flex-shrink: 0; }
        .sg-tps { display: flex; gap: 5px; flex: 1; }
        .sg-tp { font-size: 10px; padding: 3px 8px; border-radius: 5px; font-weight: 700; }
        .tph { background: rgba(16, 185, 129, .12); color: var(--g); }
        .tpm { background: rgba(255, 255, 255, .04); color: var(--faint); }
        .tpa { background: rgba(6, 182, 212, .1); color: var(--c); animation: tp-pulse 1.5s ease infinite; }
        @keyframes tp-pulse { 0%, 100% { opacity: 1 } 50% { opacity: .6 } }
        .sg-res { font-family: 'JetBrains Mono', monospace; font-weight: 800; font-size: 16px; text-align: right; min-width: 68px; }

        .channels { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 28px; }
        .ch-badge {
          padding: 7px 16px; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer;
          border: 1px solid var(--border); background: rgba(255, 255, 255, .03); color: var(--muted);
          transition: all .2s; letter-spacing: .04em;
        }
        .ch-badge:hover, .ch-badge.active {
          background: rgba(6, 182, 212, .1); border-color: rgba(6, 182, 212, .3); color: var(--c);
        }
        
        .perf-link {
          display: inline-flex; align-items: center; gap: 8px; margin-top: 28px;
          font-size: 14px; font-weight: 700; color: var(--c); border-bottom: 1px solid rgba(6, 182, 212, .3);
          padding-bottom: 2px; transition: border-color .2s, gap .2s;
        }
        .perf-link:hover { border-color: var(--c); gap: 12px; }

        #personas { padding: 110px 0; background: var(--bg2); position: relative; overflow: hidden; }
        #personas::after {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(6, 182, 212, .04), transparent);
        }
        .persona-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 64px; }
        .pcard {
          padding: 38px 30px; border-radius: var(--rad-xl); cursor: pointer;
          transition: transform .3s, box-shadow .3s; position: relative; overflow: hidden;
        }
        .pcard::before {
          content: ''; position: absolute; inset: 0; border-radius: inherit;
          background: radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255, 255, 255, .03), transparent);
          pointer-events: none;
        }
        .pcard:hover { transform: translateY(-6px) scale(1.01); }
        .pc-b { background: linear-gradient(160deg, rgba(6, 182, 212, .07), rgba(6, 182, 212, .02)); border: 1px solid rgba(6, 182, 212, .13); }
        .pc-a { background: linear-gradient(160deg, rgba(212, 175, 55, .07), rgba(212, 175, 55, .02)); border: 1px solid rgba(212, 175, 55, .13); }
        .pc-p { background: linear-gradient(160deg, rgba(139, 92, 246, .07), rgba(139, 92, 246, .02)); border: 1px solid rgba(139, 92, 246, .13); }
        .pcard:hover.pc-b { box-shadow: 0 30px 80px rgba(6, 182, 212, .1); }
        .pcard:hover.pc-a { box-shadow: 0 30px 80px rgba(212, 175, 55, .1); }
        .pcard:hover.pc-p { box-shadow: 0 30px 80px rgba(139, 92, 246, .1); }
        .pavo { width: 60px; height: 60px; border-radius: 18px; display: flex; align-items: center; justify-content: center; margin-bottom: 22px; font-size: 26px; }
        .p-b { background: rgba(6, 182, 212, .1); }
        .p-a { background: rgba(212, 175, 55, .1); }
        .p-p { background: rgba(139, 92, 246, .1); }
        .pcard h3 { font-size: 19px; margin-bottom: 10px; }
        .pcard>p { font-size: 13.5px; color: var(--muted); line-height: 1.65; margin-bottom: 22px; }
        .plist { list-style: none; display: flex; flex-direction: column; gap: 9px; }
        .plist li { font-size: 13px; color: var(--muted); display: flex; align-items: flex-start; gap: 9px; }
        .plist li::before { content: '✓'; font-weight: 800; flex-shrink: 0; margin-top: 1px; }
        .pb::before { color: var(--c); }
        .pa::before { color: var(--a); }
        .pp::before { color: var(--p); }

        #broker { padding: 110px 0; }
        .broker-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 72px; align-items: center; margin-top: 56px; }
        .broker-visual {
          background: linear-gradient(135deg, rgba(6, 182, 212, .06), rgba(212, 175, 55, .03));
          border: 1px solid rgba(6, 182, 212, .14); border-radius: var(--rad-xl);
          padding: 52px 40px; text-align: center; position: relative; overflow: hidden;
        }
        .broker-visual::before {
          content: ''; position: absolute; top: -80px; left: -80px; width: 250px; height: 250px;
          border-radius: 50%; background: radial-gradient(circle, rgba(6,182,212,.08), transparent 70%);
          filter: blur(40px); pointer-events: none;
        }
        .broker-nm { font-size: 2.4rem; font-weight: 900; letter-spacing: -.03em; margin-bottom: 8px; }
        .broker-nm span { color: var(--c); }
        .broker-sub { font-size: 13px; color: var(--muted); margin-bottom: 28px; }
        .broker-badges { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; }
        .bb {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255, 255, 255, .04); border: 1px solid rgba(255, 255, 255, .07);
          border-radius: var(--rad-sm); padding: 9px 16px; font-size: 12.5px; font-weight: 700;
        }
        .bb svg { width: 16px; height: 16px; stroke: var(--c); flex-shrink: 0; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
        .broker-feats { display: flex; flex-direction: column; gap: 16px; }
        .bfeat {
          display: flex; gap: 16px; padding: 20px; border-radius: var(--rad);
          background: rgba(15, 24, 38, .6); border: 1px solid var(--border); transition: border-color .2s, transform .2s;
        }
        .bfeat:hover { border-color: rgba(6, 182, 212, .2); transform: translateX(4px); }
        .bfeat-ico { width: 46px; height: 46px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .bfeat-ico svg { width: 21px; height: 21px; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
        .bfeat h3 { font-size: 15px; margin-bottom: 5px; }
        .bfeat p { font-size: 13px; color: var(--muted); line-height: 1.55; }

        #membership { padding: 110px 0; background: var(--bg2); }
        .pricing { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 64px; }
        .prc {
          border-radius: var(--rad-xl); padding: 36px 28px; position: relative; overflow: hidden;
          background: rgba(15, 24, 38, .75); border: 1px solid var(--border);
        }
        .prc.feat {
          border-color: rgba(6, 182, 212, .5) !important;
          box-shadow: 0 0 80px rgba(6, 182, 212, .1), 0 0 0 1px rgba(6, 182, 212, .15) inset;
          transform: translateY(-8px);
        }
        .prc-badge {
          position: absolute; top: -1px; left: 50%; transform: translateX(-50%);
          background: var(--c); color: #000; font-size: 10px; font-weight: 900;
          letter-spacing: .1em; text-transform: uppercase; padding: 6px 20px; border-radius: 0 0 12px 12px;
        }
        .prc-tier { font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; }
        .prc-price { font-size: 3rem; font-weight: 900; font-family: 'JetBrains Mono', monospace; line-height: 1; margin-bottom: 6px; }
        .prc-period { font-size: 13.5px; color: var(--muted); margin-bottom: 22px; }
        .prc-desc { font-size: 13.5px; color: var(--muted); line-height: 1.65; margin-bottom: 26px; padding-bottom: 26px; border-bottom: 1px solid var(--border); }
        .prc-list { list-style: none; display: flex; flex-direction: column; gap: 14px; margin-bottom: 30px; }
        .prc-list li { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; }
        
        .fchk { width: 20px; height: 20px; border-radius: 5px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
        .fchk.y { background: rgba(16, 185, 129, .1); }
        .fchk.n { background: rgba(255, 255, 255, .04); }
        .fchk svg { width: 11px; height: 11px; }
        .fchk.y svg { stroke: var(--g); stroke-width: 2.5; fill: none; stroke-linecap: round; stroke-linejoin: round; }
        .fchk.n svg { stroke: var(--faint); stroke-width: 2; fill: none; stroke-linecap: round; }
        .ft { color: var(--muted); line-height: 1.4; }
        .ft strong { color: var(--text); font-weight: 600; }

        #testimonials { padding: 110px 0; }
        .tgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 64px; }
        .tcard {
          padding: 30px; border-radius: var(--rad);
          background: rgba(15, 24, 38, .65); border: 1px solid var(--border);
          transition: border-color .3s, transform .3s; position: relative;
        }
        .tcard:hover { border-color: rgba(255, 255, 255, .1); transform: translateY(-3px); }
        .tcard::before {
          content: '\\201C'; position: absolute; top: 16px; right: 22px;
          font-size: 80px; line-height: 1; color: rgba(6, 182, 212, .07); font-family: Georgia, serif;
          pointer-events: none;
        }
        .tstars { display: flex; gap: 4px; margin-bottom: 18px; }
        .tstars svg { width: 14px; height: 14px; fill: var(--a); color: var(--a); }
        .tq { font-size: 14.5px; line-height: 1.72; color: var(--muted); margin-bottom: 22px; font-style: italic; }
        .tq em { color: var(--text); font-style: normal; font-weight: 600; }
        .tauthor { display: flex; align-items: center; gap: 12px; }
        .tav { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; flex-shrink: 0; }
        .tname { font-size: 13.5px; font-weight: 700; }
        .trole { font-size: 11px; color: var(--muted); margin-top: 2px; }

        #faq { padding: 110px 0; background: var(--bg2); }
        .faq-list { display: flex; flex-direction: column; gap: 10px; margin-top: 64px; max-width: 780px; margin-left: auto; margin-right: auto; }
        .faq-item { border-radius: var(--rad); border: 1px solid var(--border); overflow: hidden; transition: border-color .2s; }
        .faq-item.open { border-color: rgba(6, 182, 212, .22); }
        .faq-q {
          display: flex; justify-content: space-between; align-items: center;
          padding: 22px 24px; cursor: pointer; font-size: 15.5px; font-weight: 600; gap: 16px;
          background: rgba(15, 24, 38, .7); transition: background .2s; user-select: none;
        }
        .faq-q:hover { background: rgba(255, 255, 255, .02); }
        .faq-arrow {
          width: 28px; height: 28px; border-radius: 7px; background: rgba(255, 255, 255, .05);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform .3s, background .2s;
        }
        .faq-item.open .faq-arrow { transform: rotate(45deg); background: rgba(6, 182, 212, .1); }
        .faq-arrow svg { width: 13px; height: 13px; stroke: var(--c); stroke-width: 2.5; fill: none; stroke-linecap: round; }
        .faq-a {
          padding: 0 24px; max-height: 0; overflow: hidden; transition: max-height .4s ease, padding .3s;
          font-size: 14.5px; color: var(--muted); line-height: 1.7; background: rgba(15, 24, 38, .7);
        }

        #cta { padding: 130px 0; position: relative; overflow: hidden; }
        .cta-orb1 {
          position: absolute; top: 50%; left: 30%; transform: translate(-50%, -50%);
          width: 700px; height: 700px; border-radius: 50%; filter: blur(120px);
          background: radial-gradient(circle, rgba(6, 182, 212, .08), transparent 70%); pointer-events: none;
        }
        .cta-orb2 {
          position: absolute; top: 50%; right: 20%; transform: translate(50%, -50%);
          width: 400px; height: 400px; border-radius: 50%; filter: blur(100px);
          background: radial-gradient(circle, rgba(212, 175, 55, .05), transparent 70%); pointer-events: none;
        }
        .cta-in { text-align: center; position: relative; z-index: 1; }
        .cta-in h2 { font-size: clamp(2.2rem, 5.5vw, 4rem); margin-bottom: 20px; }
        .cta-in>p { font-size: 18px; color: var(--muted); max-width: 600px; margin: 0 auto 44px; }
        .cta-steps { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 0; margin-bottom: 52px; }
        .cstep { display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 0 28px; }
        .cstep-n {
          width: 46px; height: 46px; border-radius: 50%;
          background: rgba(6, 182, 212, .1); border: 1.5px solid rgba(6, 182, 212, .3);
          display: flex; align-items: center; justify-content: center; font-weight: 900; color: var(--c); font-size: 17px; font-family: 'JetBrains Mono', monospace;
        }
        .cstep-l { font-size: 12.5px; color: var(--muted); font-weight: 500; text-align: center; max-width: 110px; }
        .cstep-arr { font-size: 20px; color: rgba(255, 255, 255, .1); margin-bottom: 22px; }
        .cta-btns { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
        .cta-note { font-size: 13px; color: var(--faint); margin-top: 22px; }
        .cta-note a { color: var(--c); }

        footer { background: var(--bg2); border-top: 1px solid var(--border); padding: 52px 0 32px; }
        .ft-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 52px; margin-bottom: 48px; }
        .ft-brand { max-width: 290px; }
        .ft-brand p { font-size: 13.5px; color: var(--muted); line-height: 1.7; margin-top: 16px; }
        .ft-col h4 { font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin-bottom: 18px; }
        .ft-col ul { list-style: none; display: flex; flex-direction: column; gap: 11px; }
        .ft-col a { font-size: 13.5px; color: var(--faint); transition: color .2s; }
        .ft-col a:hover { color: var(--text); }
        .ft-bottom {
          padding-top: 24px; border-top: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
          font-size: 12.5px; color: var(--faint);
        }
        .ft-disclaimer {
          font-size: 11.5px; color: var(--faint); margin-top: 20px; line-height: 1.65;
          padding: 16px; background: rgba(255, 255, 255, .02); border-radius: var(--rad-sm); border: 1px solid var(--border);
        }

        .reveal { opacity: 0; transform: translateY(28px); transition: opacity .75s cubic-bezier(.22,.68,0,1.15), transform .75s cubic-bezier(.22,.68,0,1.15); }
        .reveal.vis { opacity: 1; transform: none; }
        .d1 { transition-delay: .08s }
        .d2 { transition-delay: .16s }
        .d3 { transition-delay: .24s }
        .d4 { transition-delay: .32s }
        .reveal-l { opacity: 0; transform: translateX(-28px); transition: opacity .75s ease, transform .75s ease; }
        .reveal-l.vis { opacity: 1; transform: none; }
        .reveal-r { opacity: 0; transform: translateX(28px); transition: opacity .75s ease, transform .75s ease; }
        .reveal-r.vis { opacity: 1; transform: none; }

        @media(max-width: 1024px) {
          .hero-layout { grid-template-columns: 1fr; gap: 56px; }
          .steps { grid-template-columns: 1fr 1fr; }
          .steps::before { display: none; }
          .broker-layout { grid-template-columns: 1fr; }
          .pricing { grid-template-columns: 1fr; max-width: 460px; margin-left: auto; margin-right: auto; }
          .prc.feat { transform: none; }
          .ft-grid { grid-template-columns: 1fr 1fr; }
        }
        @media(max-width: 768px) {
          .stats4 { grid-template-columns: 1fr 1fr; }
          .signal-grid { grid-template-columns: 1fr; }
          .persona-grid { grid-template-columns: 1fr; }
          .tgrid { grid-template-columns: 1fr; }
          .steps { grid-template-columns: 1fr; }
          .hero-proof { grid-template-columns: 1fr 1fr; }
          .nav-links { display: none; }
          .hero-ctas { flex-direction: column; }
          .hero-ctas .btn { width: 100%; }
          .ft-grid { grid-template-columns: 1fr; gap: 32px; }
          .ft-brand { max-width: 100%; }
          .cstep-arr { display: none; }
        }
        @media(max-width: 480px) {
          .stats4, .hero-proof { grid-template-columns: 1fr; }
        }
        ::selection { background: rgba(6, 182, 212, .2); color: var(--c); }
      ` }} />

      {/* ═══════════ NAV ═══════════ */}
      <header id="nav" className={scrolled ? "scrolled" : ""}>
        <div className="container">
          <div className="nav-in">
            <Link href="#" className="nav-logo logo-word">
              <div className="logo-box">
                <svg viewBox="0 0 24 24">
                  <polyline points="3 3 3 21 21 21" />
                  <polyline points="7 16 11 12 15 16 21 10" />
                </svg>
              </div>
              Fence<span>Trading</span>
            </Link>
            <nav>
              <ul className="nav-links">
                <li><a href="#how" onClick={(e) => handleAnchorClick(e, "#how")}>Kom i gang</a></li>
                <li><a href="#performance" onClick={(e) => handleAnchorClick(e, "#performance")}>Resultater</a></li>
                <li><a href="#personas" onClick={(e) => handleAnchorClick(e, "#personas")}>For deg?</a></li>
                <li><a href="#broker" onClick={(e) => handleAnchorClick(e, "#broker")}>Megler</a></li>
                <li><a href="#membership" onClick={(e) => handleAnchorClick(e, "#membership")}>Membership</a></li>
                <li><a href="#faq" onClick={(e) => handleAnchorClick(e, "#faq")}>FAQ</a></li>
              </ul>
            </nav>
            <div className="nav-right">
              <span className="live-pill">
                <span className="dot"></span>Live signals
              </span>
              <a
                href={affiliateUrl}
                target="_blank"
                className="btn btn-p"
                style={{ padding: "10px 22px", fontSize: "13.5px" }}
              >
                Kom i gang
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════ TICKER ═══════════ */}
      <div className="ticker-wrap">
        <div className="ticker-edge l"></div>
        <div className="ticker-edge r"></div>
        <div className="ticker-strip">
          {[...TICKS, ...TICKS].map((t, idx) => (
            <div className="tick" key={idx}>
              <span className="tick-sym">{t.sym}</span>
              <span className={t.dir === "LONG" ? "tick-b" : "tick-s"}>{t.dir}</span>
              <span className="tick-tp">✓ {t.tp}</span>
              <span className="tick-pips">{t.pips} pips</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ HERO ═══════════ */}
      <section id="hero">
        <div className="orb orb1"></div>
        <div className="orb orb2"></div>
        <div className="orb orb3"></div>
        <div className="hero-grid-floor"></div>

        <div className="container">
          <div className="hero-layout">
            {/* LEFT */}
            <div>
              <div className="hero-eye">
                <span className="hero-badge">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
                  </svg>
                  Premium · 2026
                </span>
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--c)", border: "1px solid rgba(6,182,212,.25)", borderRadius: "999px", padding: "4px 12px" }}>
                  Ny versjon
                </span>
              </div>
              <h1>
                Mestre markedene<br />med <span className="gt">Fence Trading</span>
              </h1>
              <p className="h1-sub">
                Eksklusive handelssignaler, automatisk copy trading og et fellesskap av vinnende tradere — alt gratis for deg som registrerer deg via vår megler.
              </p>
              <div className="hero-ctas">
                <a href={affiliateUrl} target="_blank" className="btn btn-p">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="13 17 18 12 13 7" />
                    <polyline points="6 17 11 12 6 7" />
                  </svg>
                  Start trading nå
                </a>
                <a href="#how" className="btn btn-o" onClick={(e) => handleAnchorClick(e, "#how")}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Hvordan fungerer det?
                </a>
              </div>
              <div className="hero-proof">
                <div className="hp-item">
                  <div className="hp-num">
                    <CountUp value={120544} suffix="+" />
                  </div>
                  <div className="hp-label">Pips levert totalt</div>
                </div>
                <div className="hp-item">
                  <div className="hp-num">
                    <CountUp value={stats.total} />
                  </div>
                  <div className="hp-label">Signaler sendt</div>
                </div>
                <div className="hp-item">
                  <div className="hp-num">5</div>
                  <div className="hp-label">Aktive kanaler</div>
                </div>
              </div>
            </div>

            {/* RIGHT – 3D Card wrapper */}
            <div className="card3d-wrap" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
              <div className="chip chip-a">
                <div className="chip-ico cig">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                </div>
                <div>
                  <div className="chip-num" style={{ color: "var(--g)" }}>+240</div>
                  <div className="chip-label">pips i dag</div>
                </div>
              </div>

              <div
                className="card3d"
                style={{
                  transform: `rotateY(${tilt.ry}deg) rotateX(${tilt.rx}deg) translateZ(10px)`,
                }}
              >
                <div className="card-top">
                  <span className="card-title">Live signal feed</span>
                  <span className="live-tag">
                    <span className="dot"></span>Aktiv
                  </span>
                </div>
                <div className="sig-row">
                  <span className="sig-sym">XAUUSD</span>
                  <span className="sig-dir buy">LONG</span>
                  <span className="sig-state">TP3 ✓</span>
                  <span className="sig-pip">+80p</span>
                </div>
                <div className="sig-row">
                  <span className="sig-sym">US30</span>
                  <span className="sig-dir sell">SHORT</span>
                  <span className="sig-state">TP4 ✓</span>
                  <span className="sig-pip">+150p</span>
                </div>
                <div className="sig-row">
                  <span className="sig-sym">BTCUSD</span>
                  <span className="sig-dir buy">LONG</span>
                  <span className="sig-state">TP4 ✓</span>
                  <span className="sig-pip">+500p</span>
                </div>
                <div className="sig-row">
                  <span className="sig-sym">GBPUSD</span>
                  <span className="sig-dir buy">LONG</span>
                  <span className="sig-state" style={{ color: "var(--a)" }}>Aktiv ▶</span>
                  <span className="sig-pip live">Pågår</span>
                </div>
                <div className="sig-row">
                  <span className="sig-sym">NAS100</span>
                  <span className="sig-dir sell">SHORT</span>
                  <span className="sig-state">TP3 ✓</span>
                  <span className="sig-pip">+120p</span>
                </div>
              </div>

              <div className="chip chip-b">
                <div className="chip-ico cia">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <div className="chip-num" style={{ color: "var(--a)" }}>4 200+</div>
                  <div className="chip-label">aktive tradere</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section id="how">
        <div className="container">
          <div className="reveal">
            <div className="sl">Prosessen</div>
            <h2>Fire steg til gratis premium-tilgang</h2>
          </div>
          <div className="steps">
            <div className="step reveal d1">
              <div className="step-bg-num">01</div>
              <div className="step-dot" style={{ background: "var(--c)" }}></div>
              <div className="step-ico sib">
                <svg viewBox="0 0 24 24">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3>Registrer deg</h3>
              <p>Opprett konto hos Trade Nation via vår link. Gratis, under 5 minutter.</p>
            </div>
            <div className="step reveal d2">
              <div className="step-bg-num">02</div>
              <div className="step-dot" style={{ background: "var(--a)" }}></div>
              <div className="step-ico sia">
                <svg viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4" />
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                </svg>
              </div>
              <h3>Verifiser registreringen</h3>
              <p>Send oss bevis via verifiseringssiden. Vi godkjenner innen noen timer.</p>
            </div>
            <div className="step reveal d3">
              <div className="step-bg-num">03</div>
              <div className="step-dot" style={{ background: "var(--g)" }}></div>
              <div className="step-ico sig">
                <svg viewBox="0 0 24 24">
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
                </svg>
              </div>
              <h3>Få Discord-tilgang</h3>
              <p>Øyeblikkelig invite til privat Discord med alle signalkanaler og community.</p>
            </div>
            <div className="step reveal d4">
              <div className="step-bg-num">04</div>
              <div className="step-dot" style={{ background: "var(--p)" }}></div>
              <div className="step-ico sip">
                <svg viewBox="0 0 24 24">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <h3>Trade og tjen</h3>
              <p>Kopier signaler manuelt eller via copy trading. Følg resultater live.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ PERFORMANCE ═══════════ */}
      <section id="performance">
        <div className="container">
          <div className="perf-head reveal">
            <div className="sl" style={{ justifyContent: "center" }}>Dokumenterte resultater</div>
            <h2>Live Performance</h2>
            <p>Transparente og verifiserbare resultater fra alle våre 5 signalkanaler. Ingen skjulte tall.</p>
          </div>

          <div className="stats4 reveal">
            <div className="s4card hl">
              <div className="s4ico" style={{ background: "rgba(6,182,212,.1)" }}>
                <svg viewBox="0 0 24 24" stroke="var(--c)">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
              <div className="s4num text-c">
                <CountUp value={stats.pips} />
              </div>
              <div className="s4label">Total pips levert</div>
              <div className="s4sub">Alle kanaler</div>
            </div>
            <div className="s4card">
              <div className="s4ico" style={{ background: "rgba(16,185,129,.1)" }}>
                <svg viewBox="0 0 24 24" stroke="var(--g)">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <div className="s4num text-g">{stats.winrate}</div>
              <div className="s4label">Vinnrate</div>
              <div className="s4sub">Ekskl. breakeven</div>
            </div>
            <div className="s4card">
              <div className="s4ico" style={{ background: "rgba(212,175,55,.1)" }}>
                <svg viewBox="0 0 24 24" stroke="var(--a)">
                  <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                  <path d="M18 17V9" />
                  <path d="M13 17V5" />
                  <path d="M8 17v-3" />
                </svg>
              </div>
              <div className="s4num text-a">{stats.active}</div>
              <div className="s4label">Aktive trades</div>
              <div className="s4sub">Akkurat nå</div>
            </div>
            <div className="s4card">
              <div className="s4ico" style={{ background: "rgba(139,92,246,.1)" }}>
                <svg viewBox="0 0 24 24" stroke="var(--p)">
                  <path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z" />
                  <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                </svg>
              </div>
              <div className="s4num" style={{ color: "var(--p)" }}>
                <CountUp value={stats.total} />
              </div>
              <div className="s4label">Totale signaler</div>
              <div className="s4sub">Jan 2025 →</div>
            </div>
          </div>

          {/* Recent signals */}
          <div className="reveal">
            <div className="channels">
              <span className={`ch-badge ${activeChannel === "all" ? "active" : ""}`} onClick={() => setActiveChannel("all")}>Alle kanaler</span>
              <span className={`ch-badge ${activeChannel === "Fence - Main" ? "active" : ""}`} onClick={() => setActiveChannel("Fence - Main")}>Main</span>
              <span className={`ch-badge ${activeChannel === "Fence - Odin" ? "active" : ""}`} onClick={() => setActiveChannel("Fence - Odin")}>Odin</span>
              <span className={`ch-badge ${activeChannel === "Fence - Aurora" ? "active" : ""}`} onClick={() => setActiveChannel("Fence - Aurora")}>Aurora</span>
              <span className={`ch-badge ${activeChannel === "Fence - Crypto" ? "active" : ""}`} onClick={() => setActiveChannel("Fence - Crypto")}>Crypto</span>
              <span className={`ch-badge ${activeChannel === "Fence - Live / Indices" ? "active" : ""}`} onClick={() => setActiveChannel("Fence - Live / Indices")}>Indices</span>
            </div>
            
            <div className="signal-grid">
              {filteredSignals.slice(0, 6).map((s, index) => {
                const isLong = s.type === "LONG" || s.type === "BUY";
                const dirClass = isLong ? "buy" : "sell";
                const dirLabel = isLong ? "LONG" : "SHORT";
                const pip = s.pips || 0;
                const pipCol = pip > 0 ? "var(--g)" : pip < 0 ? "var(--r)" : "var(--muted)";
                const pipStr = pip > 0 ? "+" + pip.toFixed(0) + "p" : pip < 0 ? pip.toFixed(0) + "p" : "—";
                const tp1 = (s.tp_level ?? 0) >= 1;
                const tp2 = (s.tp_level ?? 0) >= 2;
                const tp3 = (s.tp_level ?? 0) >= 3;
                const tp4 = (s.tp_level ?? 0) >= 4;
                const open = ["OPEN", "NEW"].includes(s.status);
                const date = new Date(s.timestamp || s.open_time || "");
                const dateStr = isNaN(date.getTime()) ? "" : date.toLocaleDateString("no-NO", { day: "2-digit", month: "short" });

                return (
                  <div className="sg-card" key={s.id || index}>
                    <div className="sg-pair-block" style={{ minWidth: "76px" }}>
                      <div className="sg-pair">{s.symbol}</div>
                      <div className="sg-time">
                        {dateStr}{s.channel_name ? ` · ${s.channel_name.replace("Fence - ", "")}` : ""}
                      </div>
                    </div>
                    <span className={`sg-dir ${dirClass}`}>{dirLabel}</span>
                    <div className="sg-tps">
                      <span className={`sg-tp ${tp1 ? "tph" : open ? "tpa" : "tpm"}`}>{tp1 ? "TP1✓" : open ? "TP1▶" : "TP1"}</span>
                      <span className={`sg-tp ${tp2 ? "tph" : open ? "tpa" : "tpm"}`}>{tp2 ? "TP2✓" : open ? "TP2▶" : "TP2"}</span>
                      <span className={`sg-tp ${tp3 ? "tph" : "tpm"}`}>{tp3 ? "TP3✓" : "TP3"}</span>
                      <span className={`sg-tp ${tp4 ? "tph" : "tpm"}`}>{tp4 ? "TP4✓" : "TP4"}</span>
                    </div>
                    <div className="sg-res" style={{ color: pipCol }}>{pipStr}</div>
                  </div>
                );
              })}
              
              {filteredSignals.length === 0 && (
                <div className="sg-card" style={{ opacity: 0.5, gridColumn: "1/-1" }}>
                  <div>
                    <div className="sg-pair">Ingen signaler</div>
                    <div className="sg-time">for valgt kanal</div>
                  </div>
                </div>
              )}
            </div>

            <Link href="/performance" className="perf-link">
              Se full historikk og alle signaler
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ PERSONAS ═══════════ */}
      <section id="personas">
        <div className="container">
          <div className="reveal" style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto" }}>
            <div className="sl" style={{ justifyContent: "center" }}>Hvem er dette for?</div>
            <h2>Uansett hvem du er — dette passer deg</h2>
            <p style={{ color: "var(--muted)", fontSize: "17px", marginTop: "14px" }}>
              Fence Trading er bygget for å møte deg der du er i din trading-reise.
            </p>
          </div>
          <div className="persona-grid">
            <div className="pcard pc-b reveal d1">
              <div className="pavo p-b">🔰</div>
              <h3>Den nysgjerrige nybegynneren</h3>
              <p>Vil prøve trading, men vet ikke hvor du skal starte. Vi guider deg trygt fra dag én.</p>
              <ul className="plist pb">
                <li>Klar-til-bruk signaler — ingen analyse nødvendig</li>
                <li>Forklaringer med inngang, SL og TP</li>
                <li>Lær mens du tjener i aktivt community</li>
                <li>Risikostyring inkludert i alle signaler</li>
              </ul>
            </div>
            <div className="pcard pc-a reveal d2">
              <div className="pavo p-a">📈</div>
              <h3>Den erfarne traderen</h3>
              <p>Trader allerede, men vil ha en ekstra edge og bekreftelse på egne analyser.</p>
              <ul className="plist pa">
                <li>Multi-timeframe analyse fra profesjonelle</li>
                <li>Tidlig tilgang til high-probability setups</li>
                <li>Eksklusiv strategi-diskusjon i Discord</li>
                <li>TradingView indikatorer og scripts</li>
              </ul>
            </div>
            <div className="pcard pc-p reveal d3">
              <div className="pavo p-p">🤖</div>
              <h3>Den passive investoren</h3>
              <p>Vil ha avkastning uten å sitte foran skjermen hele dagen. Sett og glem.</p>
              <ul className="plist pp">
                <li>Automatisk copy trading — ingenting å gjøre</li>
                <li>Alle trades plasseres automatisk</li>
                <li>Full risikokontroll og position sizing</li>
                <li>Månedlig performance-rapport</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ BROKER ═══════════ */}
      <section id="broker">
        <div className="container">
          <div className="reveal">
            <div className="sl">Vår anbefalte megler</div>
            <h2>Drevet av <span className="gt">Trade Nation</span></h2>
            <p style={{ color: "var(--muted)", fontSize: "17px", marginTop: "12px", maxWidth: "580px" }}>
              Valgt fordi de kombinerer topp regulering, lav spread og sømløs TradingView-integrasjon.
            </p>
          </div>
          <div className="broker-layout">
            <div className="reveal-l reveal">
              <div className="broker-visual">
                <div className="broker-nm">Trade<span>Nation</span></div>
                <div className="broker-sub">Regulert megler · FCA · ASIC · Klientmidler segregert</div>
                <div className="broker-badges">
                  <div className="bb">
                    <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>FCA Regulert
                  </div>
                  <div className="bb">
                    <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>Sikre midler
                  </div>
                  <div className="bb">
                    <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>Lav spread
                  </div>
                  <div className="bb">
                    <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>TradingView
                  </div>
                </div>
              </div>
            </div>
            <div className="broker-feats reveal-r reveal">
              <div className="bfeat">
                <div className="bfeat-ico sib">
                  <svg viewBox="0 0 24 24" stroke="var(--c)">
                    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
                  </svg>
                </div>
                <div>
                  <h3>Cloud Trade Execution</h3>
                  <p>Ultra-lav latens for scalpere og dagstradere. Aldri gå glipp av et pip.</p>
                </div>
              </div>
              <div className="bfeat">
                <div className="bfeat-ico sia">
                  <svg viewBox="0 0 24 24" stroke="var(--a)">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <polyline points="8 21 12 17 16 21" />
                  </svg>
                </div>
                <div>
                  <h3>TradingView-integrasjon</h3>
                  <p>Handle direkte fra chartene dine. Beste chart-plattform møter beste utførelse.</p>
                </div>
              </div>
              <div className="bfeat">
                <div className="bfeat-ico sig">
                  <svg viewBox="0 0 24 24" stroke="var(--g)">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                </div>
                <div>
                  <h3>Sikker &amp; Regulert</h3>
                  <p>Pengene dine er segregert og beskyttet av topp-tier regulering (FCA, ASIC).</p>
                </div>
              </div>
              <a href={affiliateUrl} target="_blank" className="btn btn-a" style={{ width: "100%", marginTop: "4px" }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Åpne konto hos Trade Nation
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ MEMBERSHIP ═══════════ */}
      <section id="membership">
        <div className="container">
          <div className="reveal" style={{ textAlign: "center" }}>
            <div className="sl" style={{ justifyContent: "center" }}>Membership</div>
            <h2>Velg din tilgang</h2>
            <p style={{ color: "var(--muted)", fontSize: "17px", marginTop: "12px" }}>Alt starter med gratis tilgang. Oppgrader når du er klar.</p>
          </div>
          <div className="pricing">
            <div className="prc reveal d1">
              <div className="prc-tier">Gratis</div>
              <div className="prc-price">$0</div>
              <div className="prc-period">For alltid · ingen kredittkort</div>
              <div className="prc-desc">Registrer deg via vår Trade Nation-link og få umiddelbar tilgang til premium-signaler.</div>
              <ul className="prc-list">
                <li>
                  <div className="fchk y"><svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3" /></svg></div>
                  <span className="ft">Tilgang til <strong>Discord signal-kanal</strong></span>
                </li>
                <li>
                  <div className="fchk y"><svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3" /></svg></div>
                  <span className="ft"><strong>Live signals</strong> Forex, indekser, krypto</span>
                </li>
                <li>
                  <div className="fchk y"><svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3" /></svg></div>
                  <span className="ft">Community og læringsressurser</span>
                </li>
                <li>
                  <div className="fchk n"><svg viewBox="0 0 12 12"><line x1="2" y1="10" x2="10" y2="2" /><line x1="2" y1="2" x2="10" y2="10" /></svg></div>
                  <span className="ft" style={{ opacity: 0.45 }}>Copy Trading</span>
                </li>
                <li>
                  <div className="fchk n"><svg viewBox="0 0 12 12"><line x1="2" y1="10" x2="10" y2="2" /><line x1="2" y1="2" x2="10" y2="10" /></svg></div>
                  <span className="ft" style={{ opacity: 0.45 }}>Strategy Shop</span>
                </li>
              </ul>
              <a href="#how" className="btn btn-o" style={{ width: "100%" }} onClick={(e) => handleAnchorClick(e, "#how")}>
                Kom i gang gratis
              </a>
            </div>

            <div className="prc feat reveal d2" style={{ paddingTop: "52px" }}>
              <div className="prc-badge">Mest populær</div>
              <div className="prc-tier" style={{ color: "var(--c)" }}>Pro</div>
              <div className="prc-price" style={{ color: "var(--c)" }}>$49</div>
              <div className="prc-period">per måned · avbryt når som helst</div>
              <div className="prc-desc">For seriøse tradere som vil ha absolutt alt, inkl. automatisk copy trading.</div>
              <ul className="prc-list">
                <li>
                  <div className="fchk y"><svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3" /></svg></div>
                  <span className="ft">Alt fra Gratis-planen</span>
                </li>
                <li>
                  <div className="fchk y"><svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3" /></svg></div>
                  <span className="ft"><strong>Automatisk copy trading</strong></span>
                </li>
                <li>
                  <div className="fchk y"><svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3" /></svg></div>
                  <span className="ft"><strong>Strategy Shop</strong> — alle indikatorer</span>
                </li>
                <li>
                  <div className="fchk y"><svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3" /></svg></div>
                  <span className="ft">VIP-signaler med dypere analyse</span>
                </li>
                <li>
                  <div className="fchk y"><svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3" /></svg></div>
                  <span className="ft">Månedlig 1:1 performance-gjennomgang</span>
                </li>
              </ul>
              <a href="#cta" className="btn btn-p" style={{ width: "100%" }} onClick={(e) => handleAnchorClick(e, "#cta")}>
                Start Pro-perioden
              </a>
            </div>

            <div className="prc reveal d3" style={{ borderColor: "rgba(212,175,55,.18)" }}>
              <div className="prc-tier" style={{ color: "var(--a)" }}>VIP Elite</div>
              <div className="prc-price" style={{ color: "var(--a)" }}>$149</div>
              <div className="prc-period">per måned · begrenset plasser</div>
              <div className="prc-desc">Direkte tilgang til analytikerne og skreddersydde strategier for din portefølje.</div>
              <ul className="prc-list">
                <li>
                  <div className="fchk y"><svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3" /></svg></div>
                  <span className="ft">Alt fra Pro-planen</span>
                </li>
                <li>
                  <div className="fchk y"><svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3" /></svg></div>
                  <span className="ft"><strong>Direkte tilgang</strong> til analytikerne</span>
                </li>
                <li>
                  <div className="fchk y"><svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3" /></svg></div>
                  <span className="ft">Skreddersydd portefølje-strategi</span>
                </li>
                <li>
                  <div className="fchk y"><svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3" /></svg></div>
                  <span className="ft">Ukentlig video-gjennomgang</span>
                </li>
                <li>
                  <div className="fchk y"><svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3" /></svg></div>
                  <span className="ft">Prioritert support 24/7</span>
                </li>
              </ul>
              <a href="#cta" className="btn btn-a" style={{ width: "100%" }} onClick={(e) => handleAnchorClick(e, "#cta")}>
                Søk om VIP-plass
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section id="testimonials">
        <div className="container">
          <div className="reveal" style={{ textAlign: "center" }}>
            <div className="sl" style={{ justifyContent: "center" }}>Hva traderne sier</div>
            <h2>Ekte resultater, ekte folk</h2>
          </div>
          <div className="tgrid">
            <div className="tcard reveal d1">
              <div className="tstars">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
                  </svg>
                ))}
              </div>
              <p className="tq">
                «Begynte som total nybegynner. Etter to måneder med Fence Trading-signalene hadde jeg <em>mer enn doblet kontoen min</em>. Utrolig community!»
              </p>
              <div className="tauthor">
                <div className="tav" style={{ background: "rgba(6,182,212,.1)", color: "var(--c)" }}>M</div>
                <div>
                  <div className="tname">Magnus T.</div>
                  <div className="trole">Nybegynner-trader · Oslo</div>
                </div>
              </div>
            </div>
            <div className="tcard reveal d2">
              <div className="tstars">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
                  </svg>
                ))}
              </div>
              <p className="tq">
                «Brukte copy trading og <em>tjente +340 pips på XAUUSD</em> mens jeg var på ferie. Satte det opp på 20 minutter.»
              </p>
              <div className="tauthor">
                <div className="tav" style={{ background: "rgba(212,175,55,.1)", color: "var(--a)" }}>S</div>
                <div>
                  <div className="tname">Sara H.</div>
                  <div className="trole">Passiv investor · Bergen</div>
                </div>
              </div>
            </div>
            <div className="tcard reveal d3">
              <div className="tstars">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
                  </svg>
                ))}
              </div>
              <p className="tq">
                «Har traded i 5 år. Etter Fence Trading er analysen mye skarpere. <em>Signalene er presise og godt forklart.</em> Anbefaler til alle.»
              </p>
              <div className="tauthor">
                <div className="tav" style={{ background: "rgba(139,92,246,.1)", color: "var(--p)" }}>K</div>
                <div>
                  <div className="tname">Kristoffer V.</div>
                  <div className="trole">Erfaren trader · Stavanger</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section id="faq">
        <div className="container">
          <div className="reveal" style={{ textAlign: "center" }}>
            <div className="sl" style={{ justifyContent: "center" }}>FAQ</div>
            <h2>Ofte stilte spørsmål</h2>
          </div>
          <div className="faq-list">
            {FAQS.map((faq, index) => (
              <div className={`faq-item ${openFaq === index ? "open" : ""}`} key={index}>
                <div className="faq-q" onClick={() => toggleFaq(index)}>
                  {faq.q}
                  <div className="faq-arrow">
                    <svg viewBox="0 0 14 14">
                      <line x1="7" y1="2" x2="7" y2="12" />
                      <line x1="2" y1="7" x2="12" y2="7" />
                    </svg>
                  </div>
                </div>
                <div
                  className="faq-a"
                  style={{
                    maxHeight: openFaq === index ? "300px" : "0px",
                    paddingBottom: openFaq === index ? "22px" : "0px",
                    transition: "max-height 0.4s ease, padding 0.3s",
                  }}
                >
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section id="cta">
        <div className="cta-orb1"></div>
        <div className="cta-orb2"></div>
        <div className="container">
          <div className="cta-in reveal">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(212,175,55,.1)", border: "1px solid rgba(212,175,55,.25)", borderRadius: "999px", padding: "7px 18px", fontSize: "11px", fontWeight: 800, color: "var(--a)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: "28px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
              </svg>
              Gratis tilgang — Begrenset antall plasser
            </span>
            <h2>Klar til å <span className="gt">trade smartere?</span></h2>
            <p>Bli med over 4 200 tradere. Det tar under 5 minutter å komme i gang.</p>
            <div className="cta-steps">
              <div className="cstep"><div className="cstep-n">1</div><div className="cstep-l">Registrer hos Trade Nation</div></div>
              <div className="cstep-arr">→</div>
              <div className="cstep"><div className="cstep-n">2</div><div className="cstep-l">Verifiser hos oss</div></div>
              <div className="cstep-arr">→</div>
              <div className="cstep"><div className="cstep-n">3</div><div className="cstep-l">Få Discord-invite</div></div>
              <div className="cstep-arr">→</div>
              <div className="cstep"><div className="cstep-n">4</div><div className="cstep-l">Start trading!</div></div>
            </div>
            <div className="cta-btns">
              <a href={affiliateUrl} target="_blank" className="btn btn-p" style={{ fontSize: "16px", padding: "17px 38px" }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
                Registrer deg gratis nå
              </a>
              <Link href="/verify" className="btn btn-o" style={{ fontSize: "16px", padding: "17px 38px" }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 12l2 2 4-4" />
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                </svg>
                Verifiser eksisterende konto
              </Link>
            </div>
            <p className="cta-note">Har du allerede konto? <Link href="/verify">Gå rett til verifisering →</Link></p>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer>
        <div className="container">
          <div className="ft-grid">
            <div className="ft-brand">
              <Link href="#" className="nav-logo logo-word" style={{ fontSize: "17px" }}>
                <div className="logo-box">
                  <svg viewBox="0 0 24 24">
                    <polyline points="3 3 3 21 21 21" />
                    <polyline points="7 16 11 12 15 16 21 10" />
                  </svg>
                </div>
                Fence<span>Trading</span>
              </Link>
              <p>Premium handelssignaler og copy trading for alle. Gratis tilgang for Trade Nation-affiliates.</p>
            </div>
            <div className="ft-col">
              <h4>Navigasjon</h4>
              <ul>
                <li><a href="#how" onClick={(e) => handleAnchorClick(e, "#how")}>Kom i gang</a></li>
                <li><a href="#performance" onClick={(e) => handleAnchorClick(e, "#performance")}>Resultater</a></li>
                <li><a href="#broker" onClick={(e) => handleAnchorClick(e, "#broker")}>Megler</a></li>
                <li><a href="#membership" onClick={(e) => handleAnchorClick(e, "#membership")}>Membership</a></li>
                <li><a href="#faq" onClick={(e) => handleAnchorClick(e, "#faq")}>FAQ</a></li>
              </ul>
            </div>
            <div className="ft-col">
              <h4>Tjenester</h4>
              <ul>
                <li><a href="#">Live Signals</a></li>
                <li><a href="#">Copy Trading</a></li>
                <li><a href="#">Strategy Shop</a></li>
                <li><a href="#">Discord Community</a></li>
                <li><Link href="/platforms">Plattformer</Link></li>
              </ul>
            </div>
            <div className="ft-col">
              <h4>Selskap</h4>
              <ul>
                <li><Link href="/verify">Verifiser konto</Link></li>
                <li><Link href="/performance">Resultater</Link></li>
                <li><a href="#">Kontakt</a></li>
                <li><a href="#">Personvern</a></li>
                <li><a href="#">Vilkår</a></li>
              </ul>
            </div>
          </div>
          <div className="ft-disclaimer">
            ⚠️ <strong>Risikovarsel:</strong> CFD-handel innebærer høy risiko og er ikke egnet for alle investorer. Du kan tape mer enn din opprinnelige investering. Tidligere resultater er ikke en indikasjon på fremtidige resultater. Fence Trading er affiliate av Trade Nation og mottar provisjon for registreringer.
          </div>
          <div className="ft-bottom">
            <span>© {new Date().getFullYear()} Fence Trading. Alle rettigheter forbeholdt.</span>
            <span>Affiliate av Trade Nation · FCA Regulert</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
