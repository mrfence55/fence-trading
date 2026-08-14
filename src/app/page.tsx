"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  CopyCheck,
  ExternalLink,
  Gauge,
  LockKeyhole,
  MessageSquareText,
  Radio,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { TradingHeroScene } from "@/components/TradingHeroScene";
import { TradeReplayModal } from "@/components/TradeReplayModal";
import { BarChart2 } from "lucide-react";

const affiliateUrl =
  process.env.NEXT_PUBLIC_TRADENATION_AFFILIATE_URL ||
  "https://go.tradenation.com/visit/?bta=36145&brand=tradenation";

type Signal = {
  id: number;
  symbol: string;
  type: string;
  status: string;
  pips: number | null;
  tp_level: number | null;
  timestamp?: string;
  open_time?: string;
  channel_name?: string;
  rr_ratio?: number | null;
  profit?: number | null;
};

type Stats = {
  active: number;
  pips: number;
  total: number;
  winrate: number;
  latest?: Signal;
};

const fallbackSignals: Signal[] = [
  {
    id: 1,
    symbol: "XAUUSD",
    type: "BUY",
    status: "TP_HIT",
    pips: 80,
    tp_level: 3,
    channel_name: "Fence - Aurora",
    open_time: "2026-08-04T12:20:00Z",
  },
  {
    id: 2,
    symbol: "NAS100",
    type: "SELL",
    status: "OPEN",
    pips: null,
    tp_level: 0,
    channel_name: "Fence - Live / Indices",
    open_time: "2026-08-04T13:05:00Z",
  },
  {
    id: 3,
    symbol: "BTCUSD",
    type: "BUY",
    status: "TP_HIT",
    pips: 500,
    tp_level: 4,
    channel_name: "Fence - Crypto",
    open_time: "2026-08-03T17:45:00Z",
  },
  {
    id: 4,
    symbol: "GBPUSD",
    type: "SELL",
    status: "SL_HIT",
    pips: -25,
    tp_level: 0,
    channel_name: "Fence - Odin",
    open_time: "2026-08-03T10:15:00Z",
  },
];

const navItems = [
  { label: "Flyt", href: "#flow" },
  { label: "Resultater", href: "#performance" },
  { label: "Plattformer", href: "#platforms" },
  { label: "Tilgang", href: "#access" },
  { label: "FAQ", href: "#faq" },
];

const flowSteps = [
  {
    icon: ExternalLink,
    kicker: "01",
    title: "Registrer hos Trade Nation",
    text: "Bruk partnerlenken slik at registreringen kan matches mot Fence Trading.",
  },
  {
    icon: ShieldCheck,
    kicker: "02",
    title: "Verifiser identiteten",
    text: "Send inn navn, e-post og Discord eller Telegram. Verifiseringen går inn i samme kø som botene bruker.",
  },
  {
    icon: MessageSquareText,
    kicker: "03",
    title: "Få private kanaler",
    text: "Godkjente medlemmer får invite og roller for Discord, Telegram og signalarkiv.",
  },
  {
    icon: CopyCheck,
    kicker: "04",
    title: "Koble på verktøy",
    text: "Bygg videre med TradingView-rutiner, performance-side, copy trading og pro-verktøy når du er klar.",
  },
];

const platformBlocks = [
  {
    icon: Radio,
    title: "Telegram og Discord",
    text: "Signaler, oppdateringer og community fordeles på kanalene brukeren faktisk følger.",
  },
  {
    icon: BarChart3,
    title: "Live performance",
    text: "Signalhistorikk fra bot-databasen vises åpent, med kanalfilter og resultater per setup.",
  },
  {
    icon: Bot,
    title: "Automatisering",
    text: "Affiliate-sjekk, invitasjoner, roller og signal-bridge kan kobles tettere mellom systemene.",
  },
];

const accessPlans = [
  {
    title: "Verified",
    price: "Gratis",
    note: "Etter godkjent partnerregistrering",
    items: ["Discord-community", "Telegram/signalkanaler", "Signalarkiv", "Onboarding og support"],
  },
  {
    title: "Pro",
    price: "Søknad",
    note: "For copy trading og tettere oppfølging",
    items: ["Automatisk copy trading", "Prioritert onboarding", "Platform-oppsett", "Risikoregler før aktivering"],
    featured: true,
  },
  {
    title: "Strategy",
    price: "Planlagt",
    note: "TradingView, regler og læring",
    items: ["Indikatorflyt", "Setup-guider", "Eksempelbibliotek", "Strategioppdateringer"],
  },
];

const faqItems = [
  {
    q: "Er Fence Trading gratis?",
    a: "Hovedtilgangen kan være gratis når du registrerer deg via Fence Trading sin Trade Nation-lenke og blir verifisert. Eventuelle pro- eller strategitillegg kan ha egne vilkår.",
  },
  {
    q: "Hva skjer etter verifisering?",
    a: "Registreringen legges i kø, matches mot affiliate-rapporten og kan deretter gi deg invite, Discord-rolle og tilgang til relevante kanaler.",
  },
  {
    q: "Er signalene finansiell rådgivning?",
    a: "Nei. Innholdet er opplæring, markedsstruktur og signalhistorikk. Du tar egne beslutninger og må forstå risikoen før du handler.",
  },
  {
    q: "Hvilke plattformer henger sammen?",
    a: "Nettsiden kobler broker-onboarding, Discord, Telegram, signal-API, performance-side og fremtidige verktøylag som TradingView og FlockTrade.",
  },
];

const CLOSED_STATUSES = ["TP_HIT", "SL_HIT", "CLOSED", "BREAKEVEN"];

export default function Home() {
  const [signals, setSignals] = useState<Signal[]>(fallbackSignals);
  const [signalsLoaded, setSignalsLoaded] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSignals() {
      try {
        const response = await fetch("/api/signals", { cache: "no-store" });
        if (!response.ok) return;

        const data = await response.json();
        if (active && Array.isArray(data) && data.length > 0) {
          setSignals(data);
          setSignalsLoaded(true);
        }
      } catch {
        setSignalsLoaded(false);
      }
    }

    void loadSignals();

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo<Stats>(() => {
    const since2025 = signals.filter((signal) => {
      const value = signal.open_time || signal.timestamp;
      if (!value) return true;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) || date >= new Date("2025-01-01T00:00:00Z");
    });

    const closed = since2025.filter((signal) => CLOSED_STATUSES.includes(signal.status));
    const wins = closed.filter((signal) => signal.status === "TP_HIT").length;
    const losses = closed.filter((signal) => signal.status === "SL_HIT").length;
    const meaningful = wins + losses;
    const pips = since2025.reduce((sum, signal) => sum + (signal.pips || 0), 0);
    const activeTrades = since2025.filter((signal) => !CLOSED_STATUSES.includes(signal.status)).length;

    return {
      active: activeTrades,
      pips,
      total: since2025.length,
      winrate: meaningful > 0 ? Math.round((wins / meaningful) * 100) : 64,
      latest: since2025[0],
    };
  }, [signals]);

  const latestSignals = signals.slice(0, 5);

  return (
    <main className="min-h-screen bg-[#081018] text-slate-50">
      <Header />

      <section className="relative isolate min-h-[88svh] overflow-hidden">
        <TradingHeroScene />
        <Image
          src="/images/tradingview-chart-dark.png"
          alt="TradingView chart with connected Trade Nation broker flow"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-25 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_42%,rgba(103,232,249,.16),transparent_32%),linear-gradient(90deg,rgba(8,16,24,.98)_0%,rgba(8,16,24,.82)_42%,rgba(8,16,24,.42)_100%)]" />
        <div className="absolute left-1/2 top-24 hidden h-[1px] w-[min(42rem,70vw)] -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent lg:block" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#081018] to-transparent" />
        <div className="relative mx-auto flex min-h-[88svh] max-w-7xl flex-col justify-end px-5 pb-10 pt-28 sm:px-8 lg:pb-14">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className="max-w-4xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-200"
            >
              <Sparkles className="h-4 w-4" />
              3D trading interface · oppdatert for 2026
            </motion.div>
            <h1 className="max-w-4xl text-5xl font-black leading-none tracking-tight text-white sm:text-7xl lg:text-8xl">
              Fence Trading
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
              Trading-signaler, verifisert broker-onboarding og community i én ryddig flyt. Start via Trade Nation, bekreft kontoen din og få tilgang til kanalene som holder deg strukturert.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 py-4 text-sm font-black text-slate-950 shadow-[0_18px_60px_rgba(103,232,249,.26)] transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-[#081018]"
              >
                Start via Trade Nation
                <ExternalLink className="h-4 w-4" />
              </a>
              <Link
                href="/verify"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.15] bg-white/[0.08] px-5 py-4 text-sm font-black text-white backdrop-blur transition hover:border-amber-300/50 hover:bg-amber-300/10 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-[#081018]"
              >
                Verifiser tilgang
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HeroStat icon={BarChart3} label="Winrate" value={`${stats.winrate}%`} note="historiske lukkede signaler" />
            <HeroStat icon={Gauge} label="Pips" value={signed(stats.pips)} note={signalsLoaded ? "fra signal-API" : "eksempeldata ved fallback"} />
            <HeroStat icon={Activity} label="Aktive trades" value={stats.active.toString()} note="åpne signaler nå" />
            <HeroStat icon={Users} label="Community" value="4 200+" note="medlemmer og følgere" />
          </div>
        </div>
      </section>

      <section id="flow" className="border-y border-white/10 bg-[#0B1721]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:py-20">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-200">Slik låses tilgangen opp</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Fra første klikk til private signalrom.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300">
              Den nye forsiden forklarer verdien før broker-CTA-en, og binder sammen nettside, affiliate-verifisering, Discord, Telegram og performance-dashboardet.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {flowSteps.map((step) => (
              <div key={step.title} className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-xs font-black text-amber-200">{step.kicker}</span>
                  <step.icon className="h-5 w-5 text-cyan-200" />
                </div>
                <h3 className="mt-5 text-lg font-black text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="performance" className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-24">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
            <Radio className="h-4 w-4" />
            Live signal feed
          </div>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl">
            Resultater folk kan sjekke før de blir med.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            Landingssiden henter siste signaler fra samme API som performance-siden. Når databasen ikke svarer lokalt, vises trygge eksempeldata i stedet for at siden faller sammen.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Metric label="Totale signaler" value={formatNumber(stats.total)} />
            <Metric label="Åpne handler" value={formatNumber(stats.active)} />
            <Metric label="Siste symbol" value={stats.latest?.symbol || "Venter"} />
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/performance"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-100"
            >
              Se full performance
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/platforms"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.12] px-5 py-3 text-sm font-black text-white transition hover:border-cyan-300/50 hover:bg-cyan-300/10"
            >
              Se plattformflyt
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#0D1B28] p-4 shadow-2xl shadow-cyan-950/30">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Siste signaler</p>
              <p className="mt-1 text-lg font-black text-white">{signalsLoaded ? "Direkte fra API" : "Fallback-preview"}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Live
            </span>
          </div>

          <div className="divide-y divide-white/10">
            {latestSignals.map((signal) => (
              <SignalRow
                key={`${signal.id}-${signal.symbol}`}
                signal={signal}
                onSelect={() => {
                  setSelectedSignal(signal);
                  setIsModalOpen(true);
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="platforms" className="bg-[#EAF2F4] text-slate-950">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[.92fr_1.08fr] lg:items-center lg:py-24">
          <div className="relative min-h-[360px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-300/60">
            <Image
              src="/images/tradingview-connect.png"
              alt="TradingView broker connection screen with Trade Nation"
              fill
              sizes="(min-width: 1024px) 44vw, 100vw"
              className="object-cover"
            />
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-700">Integrasjoner og retning</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Bygg et system rundt traderen, ikke bare en lenke.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-700">
              Prosjektet har allerede brikker for signaler, Discord, Telegram, affiliate-verifisering og admin. Den nye landingssiden gjør det tydelig hvordan alt henger sammen og hvor neste funksjon naturlig bor.
            </p>

            <div className="mt-8 grid gap-4">
              {platformBlocks.map((item) => (
                <div key={item.title} className="grid grid-cols-[44px_1fr] gap-4 rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-cyan-200">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_.9fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">Copy trading og verktøy</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
              En renere vei fra signal til handling.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              Budskapet er strammet inn rundt disiplin, transparens og onboarding. Siden unngår garantier, men gjør det lett å forstå hvorfor brukeren bør verifisere seg og følge kanalen videre.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Feature icon={Zap} title="Rask kanaldistribusjon" text="Signalene kan speiles videre til Discord og Telegram med riktig kanal-kontekst." />
              <Feature icon={LockKeyhole} title="Verifisert tilgang" text="Broker-matchen gir en ryddig port inn til roller, invite-lenker og medlemsfordeler." />
              <Feature icon={CircleDollarSign} title="Affiliate disclosure" text="CTA-ene forklarer at Fence Trading kan motta provisjon, uten ekstra kostnad for brukeren." />
              <Feature icon={BadgeCheck} title="Tryggere claims" text="Historiske resultater presenteres som historikk, ikke som løfte om avkastning." />
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-white/10 bg-white">
            <Image
              src="/images/cloudtrade-ui.png"
              alt="Trading automation interface illustration"
              fill
              sizes="(min-width: 1024px) 42vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section id="access" className="border-y border-white/10 bg-[#0B1721]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-200">Tilgangsmodell</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Gratis inngang først. Flere lag når brukeren er klar.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300">
              Dette matcher prosjektplanen: community og signalarkiv først, strategy-materiale og pro-verktøy som naturlige oppgraderinger.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {accessPlans.map((plan) => (
              <div
                key={plan.title}
                className={`rounded-lg border p-6 ${
                  plan.featured
                    ? "border-cyan-300/[0.45] bg-cyan-300/10 shadow-2xl shadow-cyan-950/30"
                    : "border-white/10 bg-white/[0.035]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-white">{plan.title}</h3>
                    <p className="mt-2 text-sm text-slate-400">{plan.note}</p>
                  </div>
                  <div className="rounded-lg bg-white px-3 py-2 text-sm font-black text-slate-950">{plan.price}</div>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-slate-300">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-cyan-200" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[.75fr_1.25fr] lg:py-24">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">FAQ</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
            Klart nok til å konvertere. Nøkternt nok til å være troverdig.
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-300">
            De vanligste innvendingene blir besvart før brukeren sendes videre til broker, verifisering eller dashboard.
          </p>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <button
                key={item.q}
                type="button"
                onClick={() => setOpenFaq(isOpen ? -1 : index)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.035] p-5 text-left transition hover:border-cyan-300/[0.35] hover:bg-cyan-300/10"
                aria-expanded={isOpen}
              >
                <span className="flex items-center justify-between gap-4">
                  <span className="font-black text-white">{item.q}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-cyan-200 transition ${isOpen ? "rotate-180" : ""}`} />
                </span>
                {isOpen ? <span className="mt-4 block text-sm leading-7 text-slate-300">{item.a}</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-white text-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-700">Neste steg</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
              Start med registrering. Verifiser når kontoen er klar.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Fence Trading kan motta affiliate-kompensasjon. Trading i CFD-er og girede produkter innebærer høy risiko, og historiske resultater er ingen garanti for fremtidige resultater.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Registrer via partnerlenke
              <ExternalLink className="h-4 w-4" />
            </a>
            <Link
              href="/verify"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-4 text-sm font-black text-slate-950 transition hover:border-cyan-600 hover:bg-cyan-50"
            >
              Gå til verifisering
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#081018]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1.1fr_.9fr_.9fr]">
          <div>
            <Link href="/" className="flex items-center gap-3 font-black tracking-tight text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300 text-slate-950">
                <TrendingUp className="h-5 w-5" strokeWidth={2.7} />
              </span>
              <span className="text-xl">Fence<span className="text-cyan-200">Trading</span></span>
            </Link>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">
              Community-first tradingplattform for broker-onboarding, signalsporing, verifisering, Discord, Telegram og praktiske verktøy.
            </p>
          </div>
          <FooterColumn title="Produkt" links={[["Performance", "/performance"], ["Verifisering", "/verify"], ["Medlemskap", "/membership"], ["Plattformer", "/platforms"]]} />
          <FooterColumn title="Kontakt" links={[["support@fencetrading.no", "mailto:support@fencetrading.no"], ["Discord", "https://discord.gg/fence"], ["Telegram", "https://t.me/fencetrading"]]} />
        </div>
        <div className="border-t border-white/10 px-5 py-5 text-center text-xs leading-6 text-slate-500">
          © {new Date().getFullYear()} Fence Trading. Ikke finansiell rådgivning. Handle bare med kapital du tåler å tape.
        </div>
      </footer>

      {/* Interactive TradingView Trade Replay Modal */}
      <TradeReplayModal
        signal={selectedSignal}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </main>
  );
}

function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#081018]/[0.82] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3 font-black tracking-tight text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300 text-slate-950 shadow-[0_0_35px_rgba(103,232,249,.24)]">
            <TrendingUp className="h-5 w-5" strokeWidth={2.7} />
          </span>
          <span className="text-lg sm:text-xl">Fence<span className="text-cyan-200">Trading</span></span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Hovednavigasjon">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/performance"
            className="hidden items-center gap-2 rounded-lg border border-white/[0.12] px-4 py-2.5 text-sm font-black text-white transition hover:border-cyan-300/40 hover:bg-cyan-300/10 sm:inline-flex"
          >
            <Activity className="h-4 w-4" />
            Live
          </Link>
          <a
            href={affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
          >
            Start
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <Icon className="h-4 w-4 text-cyan-200" />
      </div>
      <p className="mt-3 font-mono text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{note}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 font-mono text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function SignalRow({ signal, onSelect }: { signal: Signal; onSelect: () => void }) {
  const isLong = ["BUY", "LONG"].includes(signal.type.toUpperCase());
  const isWin = signal.status === "TP_HIT";
  const isLoss = signal.status === "SL_HIT";
  const pips = signal.pips ?? 0;

  return (
    <div
      onClick={onSelect}
      className="group grid grid-cols-[1fr_auto] items-center gap-4 py-3.5 px-2.5 rounded-xl transition-all duration-200 hover:bg-white/[0.04] cursor-pointer"
      title="Klikk for å se interaktivt TradingView-chart"
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-base font-black text-white group-hover:text-cyan-300 transition-colors">
            {signal.symbol}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${
              isLong ? "bg-emerald-300/10 text-emerald-200" : "bg-red-300/10 text-red-200"
            }`}
          >
            {isLong ? "BUY" : "SELL"}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${
              isWin
                ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
                : isLoss
                  ? "border-red-300/25 bg-red-300/10 text-red-200"
                  : "border-cyan-300/25 bg-cyan-300/10 text-cyan-200"
            }`}
          >
            {statusLabel(signal.status)}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400/80 opacity-0 group-hover:opacity-100 transition-opacity">
            <BarChart2 className="h-3 w-3" /> Se graf
          </span>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          {signal.channel_name?.replace("Fence - ", "") || "Fence"} · {formatDate(signal.open_time || signal.timestamp)}
        </p>
      </div>
      <div className="text-right">
        <p className={`font-mono text-base font-black ${pips >= 0 ? "text-emerald-200" : "text-red-200"}`}>
          {signal.pips === null ? "Åpen" : signed(pips)}
        </p>
        <p className="mt-1 text-[11px] font-bold text-slate-500">TP{signal.tp_level || "-"}</p>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Zap;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
      <Icon className="h-5 w-5 text-amber-200" />
      <h3 className="mt-4 font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="font-black text-white">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm text-slate-400">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="transition hover:text-cyan-200">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function signed(value: number) {
  const rounded = Math.round(value);
  return `${rounded >= 0 ? "+" : ""}${rounded.toLocaleString("no-NO")}`;
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("no-NO");
}

function statusLabel(status: string) {
  return status.replace("_", " ").toLowerCase();
}

function formatDate(value?: string) {
  if (!value) return "nettopp";
  const date = new Date(value.endsWith("Z") || value.includes("+") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return "nettopp";

  return date.toLocaleString("no-NO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
