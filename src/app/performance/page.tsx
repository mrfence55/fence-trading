"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, RefreshCw } from "lucide-react";
import { PerformanceStats } from "@/components/PerformanceStats";
import { Signal, SignalTable } from "@/components/SignalTable";

export default function PerformancePage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [activeChannel, setActiveChannel] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function fetchSignals() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/signals", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Kunne ikke hente signalhistorikk.");
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Uventet respons fra signal-API.");
      }

      // Filter signals from Jan 1, 2025 onwards (allowing more signals to populate complete logs)
      const startDate = new Date("2025-01-01T00:00:00");
      const validSignals = data.filter((signal: Signal) => {
        const signalDate = new Date(signal.timestamp || signal.open_time || "");
        return signalDate >= startDate;
      });

      setSignals(validSignals);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Kunne ikke hente signalhistorikk."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchSignals();
  }, []);

  const visibleSignals =
    activeChannel === "All"
      ? signals
      : signals.filter(
          (signal) => (signal.channel_name || "Unknown") === activeChannel
        );

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#060A12] text-[#EEF2F8]">
      {/* Premium Styling block matching landing page and verify page */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --bg:       #060A12;
          --bg2:      #0A101C;
          --bg3:      #0F1826;
          --border:   rgba(255,255,255,0.06);
          --glow-c:   #06B6D4;
          --glow-a:   #D4AF37;
          --c:        #06B6D4;
          --a:        #D4AF37;
          --g:        #10B981;
          --r:        #EF4444;
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
          background-size: 200%;
        }

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

        .orb { position: absolute; border-radius: 50%; filter: blur(110px); pointer-events: none; }
        .orb1 { width: 600px; height: 600px; background: radial-gradient(circle, rgba(6,182,212,.08), transparent 70%); top: -200px; left: -200px; }
        .orb2 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(212,175,55,.05), transparent 70%); bottom: -200px; right: -180px; }

        .performance-grid {
          padding: 120px 0 80px; position: relative; z-index: 10;
        }
      ` }} />

      {/* ═══════════ NAV ═══════════ */}
      <header id="nav" className={scrolled ? "scrolled" : ""}>
        <div className="container">
          <div className="nav-in">
            <Link href="/" className="nav-logo logo-word">
              <div className="logo-box">
                <svg viewBox="0 0 24 24">
                  <polyline points="3 3 3 21 21 21" />
                  <polyline points="7 16 11 12 15 16 21 10" />
                </svg>
              </div>
              Fence<span>Trading</span>
            </Link>
            <div className="nav-right">
              <Link href="/" className="btn btn-o" style={{ padding: "8px 18px", fontSize: "13px" }}>
                ← Tilbake til forsiden
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Orbs */}
      <div className="orb orb1"></div>
      <div className="orb orb2"></div>

      <div className="container">
        <div className="performance-grid space-y-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between reveal">
            <div className="space-y-4">
              <span className="sl">Resultater</span>
              <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">
                Signalhistorikk &amp; <span className="gt">Live Performance</span>
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-[#8B9EC7] leading-relaxed">
                Full åpenhet og transparent sporing av samtlige signaler. Vi viser alle vinnende og tapende posisjoner med full nøyaktighet slik at du selv kan analysere og lære av resultatene.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fetchSignals()}
              disabled={isLoading}
              className="btn btn-o shrink-0"
              style={{ padding: "12px 24px" }}
            >
              <RefreshCw className={isLoading ? "h-4 w-4 animate-spin mr-2 inline" : "h-4 w-4 mr-2 inline"} />
              {isLoading ? "Laster..." : "Oppdater tall"}
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-4 text-sm text-[#fca5a5]">
              {error}
            </div>
          )}

          <div className="reveal d1">
            <PerformanceStats signals={visibleSignals} activeChannel={activeChannel} />
          </div>

          <div className="reveal d2 mt-8">
            <SignalTable
              signals={signals}
              activeChannel={activeChannel}
              onChannelChange={setActiveChannel}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 border-t border-[#border] bg-[#0A101C] mt-auto">
        <div className="container text-center text-xs text-[#8B9EC7]">
          <p>© {new Date().getFullYear()} Fence Trading. Alle rettigheter forbeholdt. Partner av Trade Nation.</p>
        </div>
      </footer>
    </div>
  );
}
