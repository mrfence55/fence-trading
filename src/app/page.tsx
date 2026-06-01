"use client";

import { useEffect, useState } from "react";
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
  const [allSignals, setAllSignals] = useState<Signal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<Signal[]>([]);
  const [activeChannel, setActiveChannel] = useState<string>("all");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [stats, setStats] = useState({
    pips: 120544,
    winrate: 74,
    active: 0,
    total: 1817,
    pipsToday: 0
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
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
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
          const cutoff = new Date("2025-01-01");
          const sigs = data.filter((s: any) => new Date(s.timestamp || s.open_time || "") >= cutoff);
          setAllSignals(sigs);

          // Calculate dynamic stats
          const totalPips = sigs.reduce((sum: number, s: any) => sum + (s.pips || 0), 0);
          const closed = sigs.filter((s: any) => ["TP_HIT", "SL_HIT"].includes(s.status));
          const wins = closed.filter((s: any) => s.status === "TP_HIT").length;
          const wr = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 74;
          const active = sigs.filter((s: any) => !["TP_HIT", "SL_HIT", "CLOSED", "BREAKEVEN"].includes(s.status)).length;

          // Pips today
          const todayStr = new Date().toDateString();
          const pipsToday = sigs.filter(s => {
            const d = new Date(s.timestamp || s.open_time || "");
            return d.toDateString() === todayStr;
          }).reduce((sum, s) => sum + (s.pips || 0), 0);

          setStats({
            pips: totalPips > 0 ? totalPips : 120544,
            winrate: wr,
            active: active,
            total: sigs.length > 0 ? sigs.length : 1817,
            pipsToday: pipsToday
          });
        }
      } catch (e) {
        console.warn("Failed to load signals from API, loading fallback static data.", e);
        const fallbackData: Signal[] = [
          { id: 1, symbol: "XAUUSD", type: "LONG", status: "TP_HIT", pips: 80, tp_level: 3, channel_name: "Fence - Aurora", open_time: new Date().toISOString() },
          { id: 2, symbol: "US30", type: "SHORT", status: "TP_HIT", pips: 150, tp_level: 4, channel_name: "Fence - Live / Indices", open_time: new Date().toISOString() },
          { id: 3, symbol: "BTCUSD", type: "LONG", status: "TP_HIT", pips: 500, tp_level: 4, channel_name: "Fence - Crypto", open_time: new Date(Date.now() - 86400000).toISOString() },
          { id: 4, symbol: "GBPUSD", type: "LONG", status: "OPEN", pips: null, tp_level: 0, channel_name: "Fence - Odin", open_time: new Date().toISOString() },
          { id: 5, symbol: "NAS100", type: "SHORT", status: "TP_HIT", pips: 120, tp_level: 3, channel_name: "Fence - Main", open_time: new Date(Date.now() - 86400000).toISOString() },
          { id: 6, symbol: "EURUSD", type: "SHORT", status: "SL_HIT", pips: -25, tp_level: 0, channel_name: "Fence - Main", open_time: new Date(Date.now() - 172800000).toISOString() },
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

  const toggleFaq = (index: number) => {
    setOpenFaq((current) => (current === index ? null : index));
  };

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    const target = document.querySelector(targetId);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#080C14] text-[#F1F5F9]">
      {/* Dynamic Embedded CSS Stylesheet from verified Utkast 1 design */}
      <style dangerouslySetInnerHTML={{ __html: `

    /* ─── DESIGN TOKENS ─────────────────────────────────────────── */
    :root {
      --bg:            #080C14;
      --bg2:           #0D1420;
      --bg3:           #111827;
      --border:        rgba(255,255,255,0.07);
      --border-glow:   rgba(6,182,212,0.25);
      --primary:       #06B6D4;
      --primary-dim:   rgba(6,182,212,0.12);
      --primary-glow:  rgba(6,182,212,0.35);
      --accent:        #D4AF37;
      --accent-dim:    rgba(212,175,55,0.12);
      --green:         #10B981;
      --green-dim:     rgba(16,185,129,0.12);
      --red:           #EF4444;
      --red-dim:       rgba(239,68,68,0.12);
      --purple:        #8B5CF6;
      --text:          #F1F5F9;
      --text-muted:    #94A3B8;
      --text-faint:    #475569;
      --radius:        14px;
      --radius-sm:     8px;
      --radius-xl:     22px;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', sans-serif;
      font-size: 16px;
      line-height: 1.6;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    a { color: inherit; text-decoration: none; }
    img { max-width: 100%; display: block; }

    /* ─── UTILITIES ─────────────────────────────────────────────── */
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .tag {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 12px; border-radius: 999px; font-size: 12px;
      font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
    }
    .tag-primary { background: var(--primary-dim); color: var(--primary); border: 1px solid var(--border-glow); }
    .tag-accent  { background: var(--accent-dim);  color: var(--accent);  border: 1px solid rgba(212,175,55,0.25); }
    .tag-green   { background: var(--green-dim);   color: var(--green);   }
    .tag-red     { background: var(--red-dim);     color: var(--red);     }

    .section-label {
      display: flex; align-items: center; gap: 10px;
      font-size: 12px; font-weight: 700; letter-spacing: .12em;
      text-transform: uppercase; color: var(--primary); margin-bottom: 16px;
    }
    .section-label::before {
      content: ''; width: 24px; height: 2px; background: var(--primary);
      border-radius: 2px;
    }

    h1, h2, h3, h4 { font-weight: 800; line-height: 1.15; }
    h1 { font-size: clamp(2.5rem, 6vw, 4.5rem); }
    h2 { font-size: clamp(1.8rem, 4vw, 3rem); }
    h3 { font-size: 1.25rem; font-weight: 700; }

    .gradient-text {
      background: linear-gradient(135deg, var(--primary) 0%, #38BDF8 40%, var(--accent) 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .glass {
      background: rgba(13,20,32,0.6);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border);
    }
    .glass-card {
      background: rgba(17,24,39,0.7);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      transition: border-color .25s, transform .25s, box-shadow .25s;
    }
    .glass-card:hover {
      border-color: var(--border-glow);
      transform: translateY(-3px);
      box-shadow: 0 20px 60px rgba(6,182,212,0.08);
    }

    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 14px 28px; border-radius: var(--radius-sm); font-weight: 700;
      font-size: 15px; cursor: pointer; border: none; transition: all .2s;
      text-decoration: none;
    }
    .btn-primary {
      background: var(--primary); color: #000;
      box-shadow: 0 0 30px var(--primary-glow);
    }
    .btn-primary:hover { background: #22D3EE; box-shadow: 0 0 50px rgba(6,182,212,0.5); transform: translateY(-1px); }
    .btn-outline {
      background: transparent; color: var(--text);
      border: 1px solid var(--border); 
    }
    .btn-outline:hover { border-color: var(--border-glow); background: var(--primary-dim); }
    .btn-accent {
      background: linear-gradient(135deg, #D4AF37, #B8962E);
      color: #000;
      box-shadow: 0 0 30px rgba(212,175,55,0.3);
    }
    .btn-accent:hover { transform: translateY(-1px); box-shadow: 0 0 50px rgba(212,175,55,0.45); }

    /* ─── NAV ───────────────────────────────────────────────────── */
    #nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      transition: background .3s, box-shadow .3s;
      padding: 0;
    }
    #nav.scrolled {
      background: rgba(8,12,20,0.9);
      backdrop-filter: blur(20px);
      box-shadow: 0 1px 0 var(--border);
    }
    .nav-inner {
      display: flex; align-items: center; justify-content: space-between;
      height: 68px; gap: 32px;
    }
    .nav-logo {
      display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 19px;
    }
    .logo-icon {
      width: 36px; height: 36px; border-radius: 9px;
      background: linear-gradient(135deg, var(--primary), #0369A1);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 20px var(--primary-glow);
    }
    .logo-icon svg { width: 20px; height: 20px; fill: #fff; }
    .nav-logo span { color: var(--primary); }

    .nav-links {
      display: flex; align-items: center; gap: 8px;
      list-style: none;
    }
    .nav-links a {
      padding: 7px 14px; border-radius: var(--radius-sm);
      font-size: 14px; font-weight: 500; color: var(--text-muted);
      transition: color .2s, background .2s;
    }
    .nav-links a:hover { color: var(--text); background: rgba(255,255,255,0.05); }
    .nav-live {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 700; color: var(--red);
      letter-spacing: .08em; text-transform: uppercase;
    }
    .pulse-dot {
      width: 8px; height: 8px; border-radius: 50%; background: var(--red);
      animation: pulse 1.6s infinite;
    }
    @keyframes pulse {
      0%,100% { opacity:1; transform:scale(1); box-shadow:0 0 0 0 rgba(239,68,68,.4); }
      50%      { opacity:.8; transform:scale(1.1); box-shadow:0 0 0 5px rgba(239,68,68,0); }
    }
    .nav-cta-group { display: flex; align-items: center; gap: 10px; }
    .mobile-menu-btn {
      display: none; background: none; border: none; cursor: pointer;
      color: var(--text); padding: 6px;
    }

    /* ─── TICKER ────────────────────────────────────────────────── */
    .ticker-bar {
      background: var(--bg2); border-bottom: 1px solid var(--border);
      overflow: hidden; position: relative; height: 44px;
      display: flex; align-items: center;
    }
    .ticker-fade-l, .ticker-fade-r {
      position: absolute; top:0; bottom:0; width: 80px; z-index: 2; pointer-events: none;
    }
    .ticker-fade-l { left:0; background:linear-gradient(to right, var(--bg2), transparent); }
    .ticker-fade-r { right:0; background:linear-gradient(to left, var(--bg2), transparent); }
    .ticker-track {
      display: flex; gap: 0; white-space: nowrap;
      animation: ticker 40s linear infinite;
    }
    .ticker-track:hover { animation-play-state: paused; }
    @keyframes ticker {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .tick-item {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 0 20px; font-size: 13px; border-right: 1px solid var(--border);
    }
    .tick-pair { font-weight: 700; font-size: 12px; letter-spacing: .04em; }
    .tick-pips { font-family:'JetBrains Mono',monospace; font-weight:600; font-size:13px; }
    .tick-tp  { font-size: 11px; font-weight: 600; color: var(--text-muted); }

    /* ─── HERO ──────────────────────────────────────────────────── */
    #hero {
      min-height: 100vh;
      display: flex; flex-direction: column; justify-content: center;
      position: relative; overflow: hidden; padding-top: 140px; padding-bottom: 80px;
    }
    .hero-orb {
      position: absolute; border-radius: 50%; filter: blur(100px); pointer-events: none;
      animation: orb-float 8s ease-in-out infinite;
    }
    .orb-1 { width:600px; height:600px; background:radial-gradient(circle, rgba(6,182,212,0.12), transparent 70%); top:-200px; right:-100px; }
    .orb-2 { width:500px; height:500px; background:radial-gradient(circle, rgba(212,175,55,0.08), transparent 70%); bottom:-100px; left:-150px; animation-delay:-4s; }
    .orb-3 { width:300px; height:300px; background:radial-gradient(circle, rgba(139,92,246,0.07), transparent 70%); top:40%; left:50%; animation-delay:-2s; }
    @keyframes orb-float {
      0%,100% { transform:translateY(0) scale(1); }
      50%      { transform:translateY(-30px) scale(1.05); }
    }

    .hero-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center;
    }
    .hero-eyebrow { display:flex; align-items:center; gap:12px; margin-bottom:24px; flex-wrap:wrap; }
    .hero-badge {
      display:inline-flex; align-items:center; gap:8px;
      background: linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05));
      border: 1px solid rgba(212,175,55,0.3); border-radius: 999px;
      padding: 6px 14px; font-size: 12px; font-weight: 700;
      color: var(--accent); letter-spacing: .06em; text-transform: uppercase;
    }
    .hero-h1 { margin-bottom: 24px; }
    .hero-sub {
      font-size: 18px; color: var(--text-muted); max-width: 520px;
      line-height: 1.7; margin-bottom: 40px;
    }
    .hero-cta { display:flex; gap:14px; flex-wrap:wrap; margin-bottom: 48px; }
    .hero-stats {
      display: grid; grid-template-columns: repeat(3,1fr); gap: 20px;
      padding-top: 32px; border-top: 1px solid var(--border);
    }
    .hero-stat-num {
      font-size: 2rem; font-weight: 800; font-family:'JetBrains Mono',monospace;
      color: var(--primary); line-height: 1;
    }
    .hero-stat-label { font-size: 12px; color: var(--text-muted); margin-top: 4px; font-weight: 500; }

    /* Hero right: live signal card */
    .hero-card-wrap { position: relative; }
    .hero-card {
      background: var(--bg3); border: 1px solid var(--border);
      border-radius: var(--radius-xl); padding: 28px; position: relative; overflow: hidden;
    }
    .hero-card::before {
      content:''; position:absolute; inset:0; border-radius:inherit;
      background: linear-gradient(135deg, rgba(6,182,212,0.04), transparent 60%);
      pointer-events:none;
    }
    .card-header {
      display:flex; align-items:center; justify-content:space-between; margin-bottom: 20px;
    }
    .card-title { font-size: 13px; font-weight: 700; color: var(--text-muted); letter-spacing:.06em; text-transform:uppercase; }
    .signal-row {
      display:flex; align-items:center; justify-content:space-between;
      padding: 14px 0; border-bottom: 1px solid var(--border);
    }
    .signal-row:last-child { border-bottom: none; }
    .sig-pair { font-weight: 700; font-size: 15px; letter-spacing:.04em; }
    .sig-dir {
      padding: 3px 10px; border-radius: 5px; font-size: 11px; font-weight: 800; letter-spacing:.08em;
    }
    .sig-dir.buy  { background:var(--green-dim); color:var(--green); }
    .sig-dir.sell { background:var(--red-dim); color:var(--red); }
    .sig-tp { font-size: 13px; color: var(--primary); font-weight: 600; font-family:monospace; }
    .sig-pips { font-size: 14px; font-weight: 700; font-family:'JetBrains Mono',monospace; color:var(--green); }
    .sig-pips.neg { color:var(--red); }

    .floating-badge {
      position:absolute; background:var(--bg3); border:1px solid var(--border);
      border-radius:12px; padding:12px 16px; display:flex; align-items:center; gap:10px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: float-badge 5s ease-in-out infinite;
    }
    .fb-1 { top:-20px; right:-30px; animation-delay:0s; }
    .fb-2 { bottom:-20px; left:-30px; animation-delay:-2.5s; }
    @keyframes float-badge { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
    .fb-icon { width:38px;height:38px;border-radius:9px; display:flex;align-items:center;justify-content:center; }
    .fb-green { background:var(--green-dim); }
    .fb-accent { background:var(--accent-dim); }
    .fb-num { font-size:18px;font-weight:800;font-family:monospace;line-height:1; }
    .fb-label { font-size:11px;color:var(--text-muted);font-weight:500;margin-top:2px; }

    /* ─── HOW IT WORKS ──────────────────────────────────────────── */
    #how { padding: 100px 0; background: var(--bg2); }
    .steps-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:24px; margin-top:60px; }
    .step-card {
      padding:28px 24px; border-radius:var(--radius); position:relative; overflow:hidden;
    }
    .step-num {
      font-size:60px; font-weight:900; font-family:'JetBrains Mono',monospace;
      color:rgba(255,255,255,0.04); position:absolute; top:-8px; right:12px; line-height:1;
      pointer-events:none;
    }
    .step-icon {
      width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;
      margin-bottom:20px;
    }
    .step-icon svg { width:26px;height:26px; }
    .si-blue  { background:var(--primary-dim); }
    .si-gold  { background:var(--accent-dim); }
    .si-green { background:var(--green-dim); }
    .si-purple{ background:rgba(139,92,246,0.12); }
    .si-blue svg  { color:var(--primary); }
    .si-gold svg  { color:var(--accent); }
    .si-green svg { color:var(--green); }
    .si-purple svg{ color:var(--purple); }
    .step-h { font-size:17px;font-weight:700;margin-bottom:10px; }
    .step-p { font-size:14px;color:var(--text-muted);line-height:1.6; }
    .step-connector {
      position:absolute; top:50px; right:-12px; width:24px;height:2px;
      background: linear-gradient(to right, var(--primary), transparent);
    }

    /* ─── PERFORMANCE ───────────────────────────────────────────── */
    #performance { padding:100px 0; }
    .perf-header { text-align:left; margin-bottom:64px; }
    .perf-header p { color:var(--text-muted); font-size:18px; max-width:600px; margin:16px 0 0; }

    .stats-row {
      display:grid; grid-template-columns:repeat(4,1fr); gap:20px; margin-bottom:60px;
    }
    .stat-card {
      padding:32px 24px; border-radius:var(--radius); text-align:left;
    }
    .stat-icon { margin:0 0 16px; width:52px;height:52px;border-radius:999px;display:flex;align-items:center;justify-content:center; }
    .stat-num {
      font-size:2.8rem;font-weight:900;font-family:'JetBrains Mono',monospace;
      line-height:1; margin-bottom:6px;
    }
    .stat-label { font-size:13px;color:var(--text-muted);font-weight:500;margin-bottom:8px; }
    .stat-sub { font-size:11px;font-weight:600;padding:3px 12px;border-radius:999px;background:rgba(255,255,255,0.05);color:var(--text-faint); display:inline-block; }

    /* ─── SIGNAL FEED ───────────────────────────────────────────── */
    .feed-grid { display:grid;grid-template-columns:1fr 1fr;gap:20px; }
    .feed-card {
      padding:20px; border-radius:var(--radius); display:flex;align-items:center;gap:16px;
    }
    .feed-pair-block { min-width:80px; }
    .feed-pair { font-size:16px;font-weight:800;letter-spacing:.04em; }
    .feed-time { font-size:11px;color:var(--text-faint);margin-top:3px;font-family:monospace; }
    .feed-dir { padding:4px 12px;border-radius:6px;font-size:12px;font-weight:800;letter-spacing:.08em; }
    .feed-meta { flex:1;display:flex;flex-direction:column;gap:4px; }
    .feed-tp-row { display:flex;gap:6px; }
    .feed-tp { font-size:11px;padding:2px 8px;border-radius:4px;font-weight:600; }
    .tp-hit    { background:var(--green-dim);color:var(--green); }
    .tp-miss   { background:rgba(255,255,255,0.04);color:var(--text-faint); }
    .tp-active { background:var(--primary-dim);color:var(--primary); }
    .feed-result { font-size:18px;font-weight:800;font-family:monospace;text-align:right;min-width:80px; }

    /* ─── PERSONA SECTION ───────────────────────────────────────── */
    #personas { padding:100px 0; background: var(--bg2); }
    .persona-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:60px; }
    .persona-card {
      padding:36px 28px; border-radius:var(--radius-xl); cursor:pointer;
      transition: all .3s;
    }
    .persona-card:hover { transform:translateY(-4px); }
    .persona-avatar {
      width:60px;height:60px;border-radius:16px;display:flex;align-items:center;justify-content:center;
      margin-bottom:20px; font-size:28px;
    }
    .persona-h { font-size:20px;font-weight:800;margin-bottom:10px; }
    .persona-p { font-size:14px;color:var(--text-muted);line-height:1.65;margin-bottom:20px; }
    .persona-list { list-style:none;display:flex;flex-direction:column;gap:8px; }
    .persona-list li {
      font-size:13px;color:var(--text-muted);display:flex;align-items:flex-start;gap:8px;
    }
    .persona-list li::before { content:'✓';color:var(--green);font-weight:700;flex-shrink:0;margin-top:1px; }
    .pc-blue   { background:linear-gradient(135deg,rgba(6,182,212,0.08),rgba(6,182,212,0.02)); border:1px solid rgba(6,182,212,0.15); }
    .pc-gold   { background:linear-gradient(135deg,rgba(212,175,55,0.08),rgba(212,175,55,0.02)); border:1px solid rgba(212,175,55,0.15); }
    .pc-purple { background:linear-gradient(135deg,rgba(139,92,246,0.08),rgba(139,92,246,0.02)); border:1px solid rgba(139,92,246,0.15); }
    .pa-blue   { background:var(--primary-dim); }
    .pa-gold   { background:var(--accent-dim); }
    .pa-purple { background:rgba(139,92,246,0.12); }

    /* ─── BROKER ────────────────────────────────────────────────── */
    #broker { padding:100px 0; }
    .broker-grid { display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;margin-top:60px; }
    .broker-logo-box {
      background: linear-gradient(135deg, rgba(6,182,212,0.08), rgba(212,175,55,0.04));
      border: 1px solid var(--border-glow); border-radius:var(--radius-xl);
      padding:48px; text-align:center; margin-bottom:32px;
    }
    .broker-name { font-size:2.2rem;font-weight:900;letter-spacing:-.02em;margin-bottom:8px; }
    .broker-name span { color:var(--primary); }
    .broker-sub { font-size:14px;color:var(--text-muted); }
    .broker-trust { display:flex;gap:12px;flex-wrap:wrap; }
    .trust-badge {
      display:flex;align-items:center;gap:8px;
      background:rgba(255,255,255,0.04);border:1px solid var(--border);
      border-radius:var(--radius-sm);padding:10px 16px;font-size:13px;font-weight:600;
    }
    .trust-badge svg { width:18px;height:18px;color:var(--primary);flex-shrink:0; }
    .broker-features { display:flex;flex-direction:column;gap:20px; }
    .broker-feat {
      display:flex;gap:16px;padding:20px;border-radius:var(--radius);
      background:var(--bg2);border:1px solid var(--border);
      transition: border-color .2s;
    }
    .broker-feat:hover { border-color:var(--border-glow); }
    .bf-icon { width:48px;height:48px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center; }
    .bf-icon svg { width:22px;height:22px; }
    .bf-h { font-size:15px;font-weight:700;margin-bottom:5px; }
    .bf-p { font-size:13px;color:var(--text-muted);line-height:1.55; }

    /* ─── MEMBERSHIP ────────────────────────────────────────────── */
    #membership { padding:100px 0; background: var(--bg2); }
    .pricing-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:60px; }
    .pricing-card {
      border-radius:var(--radius-xl); padding:36px 28px; position:relative; overflow:hidden;
    }
    .pricing-card.featured {
      border: 1.5px solid var(--primary) !important;
      box-shadow: 0 0 60px rgba(6,182,212,0.15);
    }
    .pricing-badge {
      position:absolute;top:-1px;left:50%;transform:translateX(-50%);
      background:var(--primary);color:#000;font-size:11px;font-weight:800;
      letter-spacing:.08em;text-transform:uppercase;padding:6px 20px;
      border-radius: 0 0 12px 12px;
    }
    .pricing-tier { font-size:13px;font-weight:700;color:var(--text-muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:12px; }
    .pricing-price {
      font-size:2.8rem;font-weight:900;font-family:'JetBrains Mono',monospace;line-height:1;margin-bottom:6px;
    }
    .pricing-period { font-size:14px;color:var(--text-muted);margin-bottom:24px; }
    .pricing-desc { font-size:14px;color:var(--text-muted);line-height:1.6;margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid var(--border); }
    .pricing-features { list-style:none;display:flex;flex-direction:column;gap:14px;margin-bottom:32px; }
    .pricing-features li { display:flex;align-items:flex-start;gap:10px;font-size:14px; }
    .feat-check { width:20px;height:20px;border-radius:5px;flex-shrink:0;display:flex;align-items:center;justify-content:center;margin-top:1px; }
    .feat-check.yes { background:var(--green-dim); }
    .feat-check.no  { background:rgba(255,255,255,0.04); }
    .feat-check svg { width:12px;height:12px; }
    .feat-check.yes svg { color:var(--green); }
    .feat-check.no  svg { color:var(--text-faint); }
    .feat-text { color:var(--text-muted);line-height:1.4; }
    .feat-text strong { color:var(--text);font-weight:600; }

    /* ─── TESTIMONIALS ──────────────────────────────────────────── */
    #testimonials { padding:100px 0; }
    .testimonials-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:60px; }
    .testi-card { padding:28px;border-radius:var(--radius); }
    .testi-stars { display:flex;gap:4px;margin-bottom:16px; }
    .testi-stars svg { width:16px;height:16px;fill:var(--accent);color:var(--accent); }
    .testi-quote { font-size:15px;line-height:1.7;color:var(--text-muted);margin-bottom:20px;font-style:italic; }
    .testi-quote em { color:var(--text);font-style:normal;font-weight:600; }
    .testi-author { display:flex;align-items:center;gap:12px; }
    .testi-avatar {
      width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:16px;font-weight:700;flex-shrink:0;
    }
    .testi-name { font-size:14px;font-weight:700; }
    .testi-role { font-size:12px;color:var(--text-muted); }

    /* ─── FAQ ───────────────────────────────────────────────────── */
    #faq { padding:100px 0; background: var(--bg2); }
    .faq-list { display:flex;flex-direction:column;gap:12px;margin-top:60px;max-width:800px;margin-left:auto;margin-right:auto; }
    .faq-item {
      border-radius:var(--radius); border:1px solid var(--border); overflow:hidden;
      transition: border-color .2s;
    }
    .faq-item.open { border-color:var(--border-glow); }
    .faq-q {
      display:flex;justify-content:space-between;align-items:center;
      padding:22px 24px;cursor:pointer;font-size:16px;font-weight:600;gap:16px;
      background:var(--bg3); transition:background .2s;
    }
    .faq-q:hover { background: rgba(255,255,255,0.02); }
    .faq-arrow {
      width:28px;height:28px;border-radius:7px;background:rgba(255,255,255,0.06);
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
      transition:transform .3s, background .2s;
    }
    .faq-item.open .faq-arrow { transform:rotate(45deg);background:var(--primary-dim); }
    .faq-arrow svg { width:14px;height:14px;color:var(--primary); }
    .faq-a {
      padding:0 24px;max-height:0;overflow:hidden;transition:max-height .4s ease,padding .3s;
      font-size:15px;color:var(--text-muted);line-height:1.7; background:var(--bg3);
    }
    .faq-item.open .faq-a { max-height:300px;padding:0 24px 22px; }

    /* ─── FINAL CTA ─────────────────────────────────────────────── */
    #cta { padding:120px 0; position:relative;overflow:hidden; }
    .cta-orb {
      position:absolute;width:600px;height:600px;border-radius:50%;filter:blur(100px);pointer-events:none;
      background:radial-gradient(circle,rgba(6,182,212,0.1),transparent 70%);
      top:50%;left:50%;transform:translate(-50%,-50%);
    }
    .cta-inner { text-align:left;position:relative;z-index:1; }
    .cta-inner h2 { font-size:clamp(2rem,5vw,3.5rem);margin-bottom:20px; }
    .cta-inner p { font-size:18px;color:var(--text-muted);max-width:600px;margin:0 0 40px; }
    .cta-steps { display:flex;align-items:center;justify-content:flex-start;gap:0;margin-bottom:48px;flex-wrap:wrap;
    }
    .cta-step {
      display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 32px;
    }
    .cta-step-num {
      width:44px;height:44px;border-radius:50%;background:var(--primary-dim);border:2px solid var(--border-glow);
      display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--primary);font-size:16px;
    }
    .cta-step-label { font-size:13px;color:var(--text-muted);font-weight:500;text-align:center;max-width:120px; }
    .cta-step-arrow { font-size:20px;color:var(--border);padding: 0 0 20px; }
    .cta-btns { display:flex;gap:16px;justify-content:flex-start;flex-wrap:wrap; }
    .cta-note { font-size:13px;color:var(--text-faint);margin-top:20px; }
    .cta-note a { color:var(--primary); }

    /* ─── FOOTER ────────────────────────────────────────────────── */
    footer {
      background:var(--bg2);border-top:1px solid var(--border);padding:48px 0 32px;
    }
    .footer-grid { display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px;margin-bottom:48px; }
    .footer-brand { max-width:280px; }
    .footer-brand .nav-logo { margin-bottom:16px; }
    .footer-brand p { font-size:14px;color:var(--text-muted);line-height:1.65; }
    .footer-col h4 { font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:16px; }
    .footer-col ul { list-style:none;display:flex;flex-direction:column;gap:10px; }
    .footer-col ul a { font-size:14px;color:var(--text-faint);transition:color .2s; }
    .footer-col ul a:hover { color:var(--text); }
    .footer-bottom {
      padding-top:24px;border-top:1px solid var(--border);
      display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;
      font-size:13px;color:var(--text-faint);
    }
    .footer-disclaimer {
      font-size:12px;color:var(--text-faint);margin-top:16px;line-height:1.6;
      padding:16px;background:rgba(255,255,255,0.02);border-radius:var(--radius-sm);
      border:1px solid var(--border);
    }

    /* ─── SCROLL ANIMATIONS ─────────────────────────────────────── */
    .reveal {
      opacity:0;transform:translateY(30px);
      transition:opacity .7s cubic-bezier(.22,.68,0,1.2),transform .7s cubic-bezier(.22,.68,0,1.2);
    }
    .reveal.visible { opacity:1;transform:none; }
    .reveal-delay-1 { transition-delay:.1s; }
    .reveal-delay-2 { transition-delay:.2s; }
    .reveal-delay-3 { transition-delay:.3s; }
    .reveal-delay-4 { transition-delay:.4s; }

    /* ─── RESPONSIVE ────────────────────────────────────────────── */
    @media (max-width:1024px) {
      .hero-grid { grid-template-columns:1fr; gap:48px; }
      .steps-grid { grid-template-columns:1fr 1fr; }
      .step-connector { display:none; }
      .pricing-grid { grid-template-columns:1fr; max-width:480px; margin-left:auto;margin-right:auto; }
      .footer-grid { grid-template-columns:1fr 1fr; }
      .broker-grid { grid-template-columns:1fr; }
    }
    @media (max-width:768px) {
      .stats-row { grid-template-columns:1fr 1fr; }
      .feed-grid { grid-template-columns:1fr; }
      .persona-grid { grid-template-columns:1fr; }
      .testimonials-grid { grid-template-columns:1fr; }
      .nav-links, .nav-live { display:none; }
      .mobile-menu-btn { display:flex; }
      .steps-grid { grid-template-columns:1fr; }
      .hero-stats { grid-template-columns:1fr 1fr; }
      .footer-grid { grid-template-columns:1fr; gap:32px; }
      .footer-brand { max-width:100%; }
      .cta-step-arrow { display:none; }
    }
    @media (max-width:480px) {
      .stats-row { grid-template-columns:1fr; }
      .hero-stats { grid-template-columns:1fr; }
      .hero-cta { flex-direction:column; }
      .hero-cta .btn { width:100%;text-align:center; }
    }

    /* ─── MISC ──────────────────────────────────────────────────── */
    .divider { height:1px;background:linear-gradient(to right,transparent,var(--border) 20%,var(--border) 80%,transparent); }
    ::selection { background:var(--primary-dim); color:var(--primary); }
    :focus-visible { outline: 2px solid var(--primary); outline-offset:3px; border-radius:4px; }
  
    /* --- DYNAMIC CHANNELS & BADGES (Ported from Utkast 2) --- */
    .channels {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 28px;
    }
    .ch-badge {
      padding: 7px 16px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, .03);
      color: var(--text-muted);
      transition: all .2s;
      letter-spacing: .04em;
    }
    .ch-badge:hover, .ch-badge.active {
      background: var(--primary-dim);
      border-color: var(--border-glow);
      color: var(--primary);
    }
  
  
      ` }} />

      {/* ═══════════════════════════ NAV ═══════════════════════════════ */}
      <header id="nav" className={scrolled ? "scrolled" : ""}>
        <div className="container">
          <div className="nav-inner">
            <Link href="#" className="nav-logo">
              <div className="logo-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 3v18h18M7 16l4-4 4 4 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
              Fence<span>Trading</span>
            </Link>

            <nav>
              <ul className="nav-links">
                <li><a href="#how" onClick={(e) => handleAnchorClick(e, "#how")}>Kom i gang</a></li>
                <li><a href="#performance" onClick={(e) => handleAnchorClick(e, "#performance")}>Resultater</a></li>
                <li><a href="#broker" onClick={(e) => handleAnchorClick(e, "#broker")}>Megler</a></li>
                <li><a href="#membership" onClick={(e) => handleAnchorClick(e, "#membership")}>Membership</a></li>
                <li><a href="#faq" onClick={(e) => handleAnchorClick(e, "#faq")}>FAQ</a></li>
              </ul>
            </nav>

            <div className="nav-cta-group">
              <span className="nav-live">
                <span className="pulse-dot"></span>Live signals
              </span>
              <a href={affiliateUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: "10px 20px", fontSize: "14px" }}>Kom i gang</a>
            </div>

            <button className="mobile-menu-btn" aria-label="Meny">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════ LIVE TICKER ═══════════════════════════ */}
      <div className="ticker-bar" style={{ marginTop: "68px" }}>
        <div className="ticker-fade-l"></div>
        <div className="ticker-fade-r"></div>
        <div className="ticker-track">
          {[...TICKS, ...TICKS].map((t, idx) => (
            <div className="tick-item" key={idx}>
              <span className="tick-pair">{t.sym}</span>
              <span className={`tag ${t.dir === "LONG" ? "tag-green" : "tag-red"}`} style={{ fontSize: "10px", padding: "2px 8px" }}>
                {t.dir === "LONG" ? "BUY" : "SELL"}
              </span>
              <span className="tick-tp" style={{ color: t.dir === "LONG" ? "var(--green)" : "var(--red)" }}>
                ✓ {t.tp}
              </span>
              <span className="tick-pips mono" style={{ color: "#94A3B8" }}>
                {t.pips} pips
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════ HERO ══════════════════════════════ */}
      <section id="hero">
        <div className="hero-orb orb-1"></div>
        <div className="hero-orb orb-2"></div>
        <div className="hero-orb orb-3"></div>

        <div className="container">
          <div className="hero-grid">
            {/* LEFT */}
            <div>
              <div className="hero-eyebrow">
                <span className="hero-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  Premium Signaler
                </span>
                <span className="tag tag-primary">Ny – 2026</span>
              </div>

              <h1 className="hero-h1">
                Mestre markedene<br/>
                med <span className="gradient-text">Fence Trading</span>
              </h1>

              <p className="hero-sub">
                Eksklusive handelssignaler, automatisk copy trading og et fellesskap av vinnende tradere – alt gratis for deg som registrerer seg via vår megler.
              </p>

              <div className="hero-cta">
                <a href={affiliateUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="13 17 18 12 13 7"/>
                    <polyline points="6 17 11 12 6 7"/>
                  </svg>
                  Start trading nå
                </a>
                <a href="#how" onClick={(e) => handleAnchorClick(e, "#how")} className="btn btn-outline">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4M12 16h.01"/>
                  </svg>
                  Hvordan fungerer det?
                </a>
              </div>

              <div className="hero-stats">
                <div>
                  <div className="hero-stat-num">
                    <CountUp value={stats.winrate} suffix="%" />
                  </div>
                  <div className="hero-stat-label">Vinnrate (siste 90 dager)</div>
                </div>
                <div>
                  <div className="hero-stat-num">4 200+</div>
                  <div className="hero-stat-label">Aktive tradere</div>
                </div>
                <div>
                  <div className="hero-stat-num">
                    <CountUp value={stats.pips} suffix="+" />
                  </div>
                  <div className="hero-stat-label">Pips levert</div>
                </div>
              </div>
            </div>

            {/* RIGHT – Live signal card */}
            <div className="hero-card-wrap">
              <div className="floating-badge fb-1">
                <div className="fb-icon fb-green">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                    <polyline points="17 6 23 6 23 12"/>
                  </svg>
                </div>
                <div>
                  <div className="fb-num" style={{ color: "var(--green)" }}>
                    {stats.pipsToday >= 0 ? "+" : ""}{stats.pipsToday}
                  </div>
                  <div className="fb-label">pips i dag</div>
                </div>
              </div>

              <div className="hero-card glass-card">
                <div className="card-header">
                  <span className="card-title">Live signal feed</span>
                  <span className="tag tag-primary">
                    <span className="pulse-dot"></span> Aktive
                  </span>
                </div>

                <div id="hero-sig-preview">
                  {allSignals.slice(0, 5).map((s) => {
                    const isLong = s.type === "LONG" || s.type === "BUY";
                    const dirClass = isLong ? "buy" : "sell";
                    const dirLabel = isLong ? "BUY" : "SELL";
                    const open = !["TP_HIT", "SL_HIT", "CLOSED", "BREAKEVEN"].includes(s.status);
                    const pip = s.pips || 0;
                    const pipStr = open ? "Pågår" : (pip >= 0 ? "+" : "") + pip.toFixed(0) + " pips";
                    const pipColor = open ? "var(--primary)" : (pip >= 0 ? "var(--green)" : "var(--red)");

                    let tpText = "";
                    if (s.status === "TP_HIT") {
                      tpText = `TP${s.tp_level || 1} ✓`;
                    } else if (s.status === "SL_HIT") {
                      tpText = "SL ✗";
                    } else if (open) {
                      tpText = "Aktiv ▶";
                    } else {
                      tpText = "Lukket";
                    }

                    return (
                      <div className="signal-row" key={s.id}>
                        <span className="sig-pair">{s.symbol}</span>
                        <span className={`sig-dir ${dirClass}`}>{dirLabel}</span>
                        <span className="sig-tp" style={{ color: open ? "var(--primary)" : "inherit" }}>{tpText}</span>
                        <span className="sig-pips" style={{ color: pipColor }}>{pipStr}</span>
                      </div>
                    );
                  })}
                  {allSignals.length === 0 && (
                    <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                      Ingen aktive signaler for øyeblikket.
                    </div>
                  )}
                </div>
              </div>

              <div className="floating-badge fb-2">
                <div className="fb-icon fb-accent">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div>
                  <div className="fb-num" style={{ color: "var(--accent)" }}>4 200+</div>
                  <div className="fb-label">community-membre</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ HOW IT WORKS ══════════════════════════ */}
      <section id="how">
        <div className="container">
          <div className="reveal">
            <div className="section-label">Prosessen</div>
            <h2>Tre steg til gratis premium-tilgang</h2>
          </div>

          <div className="steps-grid">
            <div className="glass-card step-card reveal reveal-delay-1">
              <div className="step-num">01</div>
              <div className="step-icon si-blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3 className="step-h">Registrer deg</h3>
              <p className="step-p">Opprett en konto hos Trade Nation via vår affiliate-lenke. Det er gratis og tar under 5 minutter.</p>
              <div className="step-connector"></div>
            </div>

            <div className="glass-card step-card reveal reveal-delay-2">
              <div className="step-num">02</div>
              <div className="step-icon si-gold">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
                </svg>
              </div>
              <h3 className="step-h">Verifiser registreringen</h3>
              <p className="step-p">Send oss bevis på registrering via vår verifikasjonside. Vi sjekker og godkjenner innen noen timer.</p>
              <div className="step-connector"></div>
            </div>

            <div className="glass-card step-card reveal reveal-delay-3">
              <div className="step-num">03</div>
              <div className="step-icon si-green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>
                </svg>
              </div>
              <h3 className="step-h">Få øyeblikkelig tilgang</h3>
              <p className="step-p">Du får invite til vår private Discord-server med signalkanaler, copy trading og eksklusiv community.</p>
              <div className="step-connector"></div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════ PERFORMANCE ═════════════════════════ */}
      <section id="performance">
        <div className="container">
          <div className="perf-header reveal">
            <div className="section-label">Dokumenterte resultater</div>
            <h2>Live Performance</h2>
            <p>Transparente og verifiserbare resultater fra alle signalkanaler. Ingen skjulte tall.</p>
          </div>

          <div className="stats-row reveal">
            <div className="glass-card stat-card">
              <div className="stat-icon" style={{ background: "var(--primary-dim)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
                </svg>
              </div>
              <div className="stat-num" id="stat-pips" style={{ color: "var(--primary)" }}>
                <CountUp value={stats.pips} />
              </div>
              <div className="stat-label">Total pips levert</div>
              <div className="stat-sub">Alle kanaler</div>
            </div>
            <div className="glass-card stat-card">
              <div className="stat-icon" style={{ background: "var(--green-dim)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                </svg>
              </div>
              <div className="stat-num" id="stat-wr" style={{ color: "var(--green)" }}>
                <CountUp value={stats.winrate} suffix="%" />
              </div>
              <div className="stat-label">Vinnrate</div>
              <div className="stat-sub">Ekskl. breakeven</div>
            </div>
            <div className="glass-card stat-card">
              <div className="stat-icon" style={{ background: "var(--accent-dim)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
                </svg>
              </div>
              <div className="stat-num" id="stat-active" style={{ color: "var(--accent)" }}>
                {stats.active}
              </div>
              <div className="stat-label">Aktive trades</div>
              <div className="stat-sub">Akkurat nå</div>
            </div>
            <div className="glass-card stat-card">
              <div className="stat-icon" style={{ background: "rgba(139,92,246,0.12)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2">
                  <path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"/>
                  <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
                </svg>
              </div>
              <div className="stat-num" id="stat-total" style={{ color: "var(--purple)" }}>
                <CountUp value={stats.total} />
              </div>
              <div className="stat-label">Signaler siden jan 25</div>
              <div className="stat-sub">Alle instrumenter</div>
            </div>
          </div>

          {/* Signal feed preview */}
          <div className="reveal">
            <h3 style={{ marginBottom: "20px", fontSize: "18px" }}>Siste signaler</h3>

            {/* Channels filter */}
            <div className="channels" id="ch-filters">
              <span className={`ch-badge ${activeChannel === "all" ? "active" : ""}`} onClick={() => setActiveChannel("all")}>
                Alle kanaler
              </span>
              <span className={`ch-badge ${activeChannel === "Fence - Main" ? "active" : ""}`} onClick={() => setActiveChannel("Fence - Main")}>
                Main
              </span>
              <span className={`ch-badge ${activeChannel === "Fence - Odin" ? "active" : ""}`} onClick={() => setActiveChannel("Fence - Odin")}>
                Odin
              </span>
              <span className={`ch-badge ${activeChannel === "Fence - Aurora" ? "active" : ""}`} onClick={() => setActiveChannel("Fence - Aurora")}>
                Aurora
              </span>
              <span className={`ch-badge ${activeChannel === "Fence - Crypto" ? "active" : ""}`} onClick={() => setActiveChannel("Fence - Crypto")}>
                Crypto
              </span>
              <span className={`ch-badge ${activeChannel === "Fence - Live / Indices" ? "active" : ""}`} onClick={() => setActiveChannel("Fence - Live / Indices")}>
                Indices
              </span>
            </div>

            <div className="feed-grid" id="sig-preview">
              {filteredSignals.slice(0, 6).map((s) => {
                const isLong = s.type === "LONG" || s.type === "BUY";
                const dirLabel = isLong ? "BUY" : "SELL";
                const dirBg = isLong ? "var(--green-dim)" : "var(--red-dim)";
                const dirColor = isLong ? "var(--green)" : "var(--red)";

                const pip = s.pips || 0;
                const pipStr = pip > 0 ? "+" + pip.toFixed(0) + "p" : pip < 0 ? pip.toFixed(0) + "p" : "—";
                const pipColor = pip > 0 ? "var(--green)" : pip < 0 ? "var(--red)" : "var(--text-muted)";

                const date = new Date(s.timestamp || s.open_time || "");
                const dateStr = isNaN(date.getTime())
                  ? ""
                  : date.toLocaleDateString("no-NO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

                const tp1 = s.tp_level >= 1;
                const tp2 = s.tp_level >= 2;
                const tp3 = s.tp_level >= 3;
                const tp4 = s.tp_level >= 4;
                const open = !["TP_HIT", "SL_HIT", "CLOSED", "BREAKEVEN"].includes(s.status);

                return (
                  <div className="glass-card feed-card" key={s.id}>
                    <div className="feed-pair-block">
                      <div className="feed-pair">{s.symbol}</div>
                      <div className="feed-time">
                        {dateStr}{s.channel_name ? ` · ${s.channel_name.replace("Fence - ", "")}` : ""}
                      </div>
                    </div>
                    <span className={`feed-dir ${isLong ? "buy" : "sell"}`} style={{ background: dirBg, color: dirColor }}>
                      {dirLabel}
                    </span>
                    <div className="feed-meta">
                      <div className="feed-tp-row">
                        <span className={`feed-tp ${tp1 ? "tp-hit" : open ? "tp-active" : "tp-miss"}`}>TP1</span>
                        <span className={`feed-tp ${tp2 ? "tp-hit" : open ? "tp-active" : "tp-miss"}`}>TP2</span>
                        <span className={`feed-tp ${tp3 ? "tp-hit" : "tp-miss"}`}>TP3</span>
                        <span className={`feed-tp ${tp4 ? "tp-hit" : "tp-miss"}`}>TP4</span>
                      </div>
                    </div>
                    <div className="feed-result" style={{ color: pipColor }}>{pipStr}</div>
                  </div>
                );
              })}
              {filteredSignals.length === 0 && (
                <div className="glass-card feed-card" style={{ opacity: .5, gridColumn: "1/-1", justifyContent: "center", padding: "40px" }}>
                  <div style={{ textAlign: "left" }}>
                    <div className="feed-pair">Ingen signaler</div>
                    <div className="feed-time">for denne kanalen ennå</div>
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ textAlign: "left" }}>
              <Link href="/performance" className="perf-link">
                Se komplett historikk
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════ PERSONAS ═════════════════════════ */}
      <section id="personas">
        <div className="container">
          <div className="reveal">
            <div className="section-label">Hvem er dette for?</div>
            <h2>Uansett hvor du er på din reise</h2>
          </div>

          <div className="persona-grid">
            <div className="glass-card pcard pc-blue reveal reveal-delay-1">
              <div className="pavo p-b">🌱</div>
              <h3>Nybegynneren</h3>
              <p>Du har aldri handlet før, men ønsker en passiv inntekt. Vår 1-til-1 oppsett-guide og 100% passive copy trading gjør at du kan starte trygt uten forkunnskaper.</p>
              <ul className="plist">
                <li className="pb">Settes opp på under 20 minutter</li>
                <li className="pb">Helt passiv trading i hverdagen</li>
                <li className="pb">Mikro-lots for minimal risiko</li>
              </ul>
            </div>

            <div className="glass-card pcard pc-gold reveal reveal-delay-2">
              <div className="pavo p-a">📈</div>
              <h3>Den travle traderen</h3>
              <p>Du kan trading, men har ikke tid til å sitte foran skjermene hele dagen. Våre signaler gir deg presise innganger og utganger du kan plassere på farten.</p>
              <ul className="plist">
                <li className="pa">Signaler rett på telefonen din</li>
                <li className="pa">Inngang, stop loss og 4 take profits</li>
                <li className="pa">Dekker Forex, Indekser og Krypto</li>
              </ul>
            </div>

            <div className="glass-card pcard pc-purple reveal reveal-delay-3">
              <div className="pavo p-p">🏆</div>
              <h3>Pro-Traderen</h3>
              <p>Du vil ha det beste av det beste. Du ønsker tilgang til avansert markedsanalyse, VIP-community, ukentlige webinarer og de aller raskeste copy-trading serverne.</p>
              <ul className="plist">
                <li className="pp">Ultra-rask utførelse på VIP-server</li>
                <li className="pp">Eksklusiv VIP Discord-kanal</li>
                <li className="pp">Ukentlig markedsoppdatering og webinar</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════ BROKER ═════════════════════════ */}
      <section id="broker">
        <div className="container">
          <div className="broker-layout">
            <div className="reveal-l">
              <div className="section-label">Vår anbefalte megler</div>
              <h2>Drevet av <span className="gradient-text">Trade Nation</span></h2>
              <p style={{ color: "var(--muted)", fontSize: "17px", marginTop: "12px", maxWidth: "580px" }}>
                Valgt fordi de kombinerer topp regulering, lav spread og sømløs TradingView-integrasjon.
              </p>
              
              <div className="broker-feats" style={{ marginTop: "32px" }}>
                <div className="bfeat">
                  <div className="bfeat-ico" style={{ background: "var(--primary-dim)" }}>
                    <svg viewBox="0 0 24 24" stroke="var(--primary)"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <div>
                    <h3>100% Regulert & Sikker</h3>
                    <p>Regulert av britiske FCA og australske ASIC. Dine midler oppbevares på segregerte klientkontoer i førsteklasses banker.</p>
                  </div>
                </div>

                <div className="bfeat">
                  <div className="bfeat-ico" style={{ background: "var(--accent-dim)" }}>
                    <svg viewBox="0 0 24 24" stroke="var(--accent)"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  </div>
                  <div>
                    <h3>Lynrask Utførelse</h3>
                    <p>Ingen requotes eller forsinkelser. Våre copy trading systemer er koblet direkte til Trade Nations servere for minimal slippage.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="broker-visual reveal-r">
              <div className="broker-nm">Trade <span>Nation</span></div>
              <div className="broker-sub">Offisiell Fence Trading Partner</div>
              
              <div className="broker-badges" style={{ marginTop: "36px" }}>
                <div className="bb">
                  <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  FCA Regulert
                </div>
                <div className="bb">
                  <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  ASIC Regulert
                </div>
                <div className="bb">
                  <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  0.0 Pips Spread
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════ MEMBERSHIP ═════════════════════════ */}
      <section id="membership">
        <div className="container">
          <div className="reveal">
            <div className="section-label">Medlemskap og priser</div>
            <h2>Velg din plan for suksess</h2>
          </div>

          <div className="pricing">
            {/* Free */}
            <div className="prc reveal reveal-delay-1">
              <div className="prc-tier">Standard</div>
              <div className="prc-price">0,-</div>
              <div className="prc-period">alltid gratis</div>
              <p className="prc-desc">Perfekt for deg som vil trade manuelt med våre premium-signaler. Krever kun Trade Nation registrering.</p>
              <ul className="prc-list">
                <li><span className="fchk y"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span><span className="ft">Tilgang til <strong>alle 5 signalkanaler</strong></span></li>
                <li><span className="fchk y"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span><span className="ft">Presise inngangspriser & SL/TP</span></li>
                <li><span className="fchk y"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span><span className="ft">Gratis VIP Discord community</span></li>
                <li><span className="fchk n"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span><span className="ft" style={{ opacity: .4 }}>Automatisk Copy Trading</span></li>
              </ul>
              <a href={affiliateUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ width: "100%" }}>Kom i gang</a>
            </div>

            {/* Pro */}
            <div className="prc feat reveal reveal-delay-2">
              <div className="prc-badge">Mest Populær</div>
              <div className="prc-tier" style={{ color: "var(--c)" }}>Pro Plan</div>
              <div className="prc-price">499,-</div>
              <div className="prc-period">per måned / 100% gratis*</div>
              <p className="prc-desc">For deg som ønsker komplett frihet med 100% automatisk copy trading. Ingen manuelle handlinger kreves.</p>
              <ul className="prc-list">
                <li><span className="fchk y"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span><span className="ft">Alt i Standard-planen</span></li>
                <li><span className="fchk y"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span><span className="ft"><strong>100% Automatisk Copy Trading</strong></span></li>
                <li><span className="fchk y"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span><span className="ft">Tilkoblet ultra-rask VIP-server</span></li>
                <li><span className="fchk y"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span><span className="ft"><strong>*Gratis</strong> ved aktiv konto &gt;$1000</span></li>
              </ul>
              <Link href="/membership" className="btn btn-p" style={{ width: "100%" }}>Søk om Pro nå</Link>
            </div>

            {/* VIP */}
            <div className="prc reveal reveal-delay-3">
              <div className="prc-tier">VIP Elite</div>
              <div className="prc-price">999,-</div>
              <div className="prc-period">per måned / begrenset plasser</div>
              <p className="prc-desc">For profesjonelle eller kapitalsterke tradere som ønsker direkte oppfølging og maksimale resultater.</p>
              <ul className="prc-list">
                <li><span className="fchk y"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span><span className="ft">Alt i Pro Planen</span></li>
                <li><span className="fchk y"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span><span className="ft">1-til-1 personlig onboarding</span></li>
                <li><span className="fchk y"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span><span className="ft">Ubegrenset støtte og prioritert support</span></li>
                <li><span className="fchk y"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span><span className="ft">Invitasjon til lukkede VIP samlinger</span></li>
              </ul>
              <Link href="/membership" className="btn btn-outline" style={{ width: "100%" }}>Søk om VIP-tilgang</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════ TESTIMONIALS ═════════════════════════ */}
      <section id="testimonials">
        <div className="container">
          <div className="reveal">
            <div className="section-label">Hva våre medlemmer sier</div>
            <h2>Resultater som snakker for seg selv</h2>
          </div>

          <div className="tgrid">
            <div className="glass-card tcard reveal reveal-delay-1">
              <div className="tstars">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ))}
              </div>
              <p className="tq">"Har brukt Fence Trading i 3 måneder nå. Copy tradingen settes opp én gang, og siden har alt gått helt av seg selv. Porteføljen min er opp <strong>over 24%</strong> så langt!"</p>
              <div className="tauthor">
                <div className="tav p-b">MS</div>
                <div>
                  <div className="tname">Morten S.</div>
                  <div className="trole">Pro Medlem</div>
                </div>
              </div>
            </div>

            <div className="glass-card tcard reveal reveal-delay-2">
              <div className="tstars">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ))}
              </div>
              <p className="tq">"Det at alt er 100% gratis ved å registrere seg hos Trade Nation er fantastisk. Signalene er superpresise og SL/TP holdes alltid. Aurora-kanalen på gull er en <em>absolutt pengemaskin</em>!"</p>
              <div className="tauthor">
                <div className="tav p-a">EK</div>
                <div>
                  <div className="tname">Eirik K.</div>
                  <div className="trole">Standard Medlem</div>
                </div>
              </div>
            </div>

            <div className="glass-card tcard reveal reveal-delay-3">
              <div className="tstars">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ))}
              </div>
              <p className="tq">"Onboardingen var utrolig ryddig. Jeg fikk VIP-invitasjon til Discord med en gang verifikasjonen var godkjent. Copy tradingen fungerer uten noen som helst forsinkelser på serveren."</p>
              <div className="tauthor">
                <div className="tav p-p">TL</div>
                <div>
                  <div className="tname">Thomas L.</div>
                  <div className="trole">VIP Medlem</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════ FAQ ═════════════════════════ */}
      <section id="faq">
        <div className="container">
          <div className="reveal">
            <div className="section-label">Ofte stilte spørsmål</div>
            <h2>FAQ</h2>
          </div>

          <div className="faq-list">
            {FAQS.map((f, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div className={`faq-item ${isOpen ? "open" : ""}`} key={idx}>
                  <div className="faq-q" onClick={() => toggleFaq(idx)}>
                    {f.q}
                    <div className="faq-arrow">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </div>
                  </div>
                  <div className="faq-a" style={{ maxHeight: isOpen ? "300px" : "0", padding: isOpen ? "0 24px 22px" : "0 24px" }}>
                    {f.a}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═════════════════════════ FINAL CTA ═════════════════════════ */}
      <section id="cta">
        <div className="cta-orb1"></div>
        <div className="cta-orb2"></div>
        <div className="cta-in container">
          <div className="reveal">
            <h2>Klar til å dominere markedene?</h2>
            <p>Bli med i dag helt kostnadsfritt. Det tar under 15 minutter å settes opp.</p>
          </div>

          <div className="cta-steps reveal">
            <div className="cstep">
              <div className="cstep-n">1</div>
              <div className="cstep-l">Registrer Trade Nation konto</div>
            </div>
            <div className="cstep-arr">➜</div>
            <div className="cstep">
              <div className="cstep-n">2</div>
              <div className="cstep-l">Verifiser hos oss</div>
            </div>
            <div className="cstep-arr">➜</div>
            <div className="cstep">
              <div className="cstep-n">3</div>
              <div className="cstep-l">Få Discord invitasjon</div>
            </div>
          </div>

          <div className="cta-btns reveal">
            <a href={affiliateUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Start trading nå</a>
            <Link href="/verify" className="btn btn-outline">Verifiser kontoen din</Link>
          </div>

          <div className="cta-note reveal">
            Har du spørsmål? <a href="mailto:support@fencetrading.no">Ta kontakt med support</a>
          </div>
        </div>
      </section>

      {/* ═════════════════════════ FOOTER ═════════════════════════ */}
      <footer>
        <div className="container">
          <div className="ft-grid">
            <div className="ft-brand">
              <div className="nav-logo">
                <div className="logo-icon">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3v18h18M7 16l4-4 4 4 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </div>
                Fence<span>Trading</span>
              </div>
              <p>Profesjonelle trading-signaler og copy-trading helt passivt og gratis. Vi hjelper deg å lykkes med markedet.</p>
            </div>

            <div className="ft-col">
              <h4>Navigasjon</h4>
              <ul>
                <li><a href="#how" onClick={(e) => handleAnchorClick(e, "#how")}>Kom i gang</a></li>
                <li><a href="#performance" onClick={(e) => handleAnchorClick(e, "#performance")}>Resultater</a></li>
                <li><a href="#broker" onClick={(e) => handleAnchorClick(e, "#broker")}>Vår megler</a></li>
                <li><a href="#membership" onClick={(e) => handleAnchorClick(e, "#membership")}>Medlemskap</a></li>
              </ul>
            </div>

            <div className="ft-col">
              <h4>Verktøy</h4>
              <ul>
                <li><Link href="/verify">Verifisering</Link></li>
                <li><Link href="/performance">Resultatside</Link></li>
                <li><Link href="/membership">Medlemskap søknad</Link></li>
              </ul>
            </div>

            <div className="ft-col">
              <h4>Kontakt</h4>
              <ul>
                <li><a href="mailto:support@fencetrading.no">support@fencetrading.no</a></li>
                <li><a href="https://discord.gg/fence" target="_blank" rel="noopener noreferrer">Discord Server</a></li>
                <li><a href="https://t.me/fencetrading" target="_blank" rel="noopener noreferrer">Telegram Feed</a></li>
              </ul>
            </div>
          </div>

          <div className="ft-bottom">
            <div>&copy; {new Date().getFullYear()} Fence Trading. Alle rettigheter reservert.</div>
            <div style={{ display: "flex", gap: "16px" }}>
              <Link href="/privacy">Personvern</Link>
              <Link href="/terms">Vilkår for bruk</Link>
            </div>
          </div>

          <div className="ft-disclaimer">
            <strong>Risiko Disclaimer:</strong> Finansiell trading innebærer høy risiko og passer ikke for alle investorer. Leveraged trading (giring) kan fungere både for og mot deg, og øker risikoen for tap av kapital. Historiske resultater fra våre handelssignaler er ingen garanti for fremtidig avkastning. Fence Trading er ikke en registrert investeringsrådgiver, og alle våre signaler og copy trading tjenester tilbys kun for informasjons- og utdanningsformål. Du er selv ansvarlig for all risiko og alle tradingbeslutninger du foretar på din egen handelskonto.
          </div>
        </div>
      </footer>
    </div>
  );
}
