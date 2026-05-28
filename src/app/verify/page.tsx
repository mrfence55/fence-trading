"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";

const affiliateUrl =
  process.env.NEXT_PUBLIC_TRADENATION_AFFILIATE_URL ||
  "https://go.tradenation.com/visit/?bta=36145&brand=tradenation";

type FormState = {
  name: string;
  country: string;
  email: string;
  discordUserId: string;
  discordUsername: string;
  telegramUsername: string;
};

const initialForm: FormState = {
  name: "",
  country: "",
  email: "",
  discordUserId: "",
  discordUsername: "",
  telegramUsername: "",
};

export default function VerifyPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [requestId, setRequestId] = useState<string | number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    setRequestId(null);

    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke sende inn verifisering.");
      }

      setStatus("success");
      setRequestId(data.id);
      setMessage(
        "Vi har mottatt verifiseringen din! Når registreringen matcher i affiliate-portalen, opprettes invite-lenker og roller automatisk."
      );
      setForm(initialForm);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Kunne ikke sende inn verifisering akkurat nå."
      );
    }
  }

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#060A12] text-[#EEF2F8]">
      {/* Premium CSS Styling for visual continuity */}
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
          transition: border-color .3s, box-shadow .3s, transform .3s;
        }
        .card:hover {
          border-color: rgba(6, 182, 212, 0.22);
          box-shadow: 0 24px 80px rgba(6, 182, 212, 0.07), 0 0 0 1px rgba(6, 182, 212, 0.08) inset;
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
        .nav-links { display: flex; list-style: none; gap: 4px; }
        .nav-links a {
          padding: 8px 15px; border-radius: var(--rad-sm);
          font-size: 13.5px; font-weight: 500; color: var(--muted);
          transition: color .2s, background .2s;
        }
        .nav-links a:hover { color: var(--text); background: rgba(255, 255, 255, .05); }

        .orb { position: absolute; border-radius: 50%; filter: blur(110px); pointer-events: none; }
        .orb1 { width: 600px; height: 600px; background: radial-gradient(circle, rgba(6,182,212,.08), transparent 70%); top: -200px; right: -200px; }
        .orb2 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(212,175,55,.05), transparent 70%); bottom: -200px; left: -180px; }

        .verify-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: start;
          padding: 120px 0 80px; position: relative; z-index: 10;
        }

        .step-tag {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.25);
          border-radius: 999px; padding: 6px 16px; font-size: 11px; font-weight: 800; color: var(--c);
          letter-spacing: .08em; text-transform: uppercase; margin-bottom: 24px;
        }

        .input-field {
          width: 100%; height: 48px; border-radius: var(--rad-sm);
          background: rgba(6, 10, 18, 0.7); border: 1px solid var(--border);
          color: var(--text); padding: 0 16px; font-size: 14.5px;
          outline: none; transition: border-color .2s, box-shadow .2s;
        }
        .input-field:focus {
          border-color: rgba(6, 182, 212, 0.4);
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.15);
        }

        .c-step-card {
          padding: 20px; border-radius: var(--rad); background: rgba(15, 24, 38, 0.4);
          border: 1px solid var(--border); display: flex; gap: 16px; align-items: center;
        }
        .c-step-num {
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(6, 182, 212, 0.1); border: 1.5px solid rgba(6, 182, 212, 0.3);
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; color: var(--c); font-size: 14px; font-family: 'JetBrains Mono', monospace; flex-shrink: 0;
        }

        @media(max-width: 1024px) {
          .verify-grid { grid-template-columns: 1fr; gap: 48px; }
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
        <div className="verify-grid">
          {/* LEFT SIDE: Info & Guidelines */}
          <div className="reveal">
            <span className="step-tag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline mr-1.5" style={{ transform: "translateY(-1px)" }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Sikker Verifisering
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6" style={{ lineHeight: 1.15 }}>
              Lås opp tilgangen til <span className="gt">Fence Trading</span>
            </h1>
            <p className="text-lg text-[#8B9EC7] mb-8 leading-relaxed">
              For å få gratis tilgang må du opprette konto hos vår broker-partner **Trade Nation** via vår lenke. Fyll ut skjemaet med samme informasjon som du oppga hos brokeren. Vi matcher opplysningene mot partner-rapporten vår og gir deg invite innen få timer!
            </p>

            {/* Stegliste */}
            <div className="flex flex-col gap-4 mb-8">
              <div className="c-step-card">
                <div className="c-step-num">1</div>
                <div>
                  <h4 className="font-bold text-sm text-[#EEF2F8]">Registrer hos broker</h4>
                  <p className="text-xs text-[#8B9EC7] mt-0.5">Bruk vår Trade Nation registreringslenke for å bli registrert under oss.</p>
                </div>
              </div>
              <div className="c-step-card">
                <div className="c-step-num">2</div>
                <div>
                  <h4 className="font-bold text-sm text-[#EEF2F8]">Send inn dette skjemaet</h4>
                  <p className="text-xs text-[#8B9EC7] mt-0.5">Oppgi navn, e-post og brukernavn på Discord/Telegram så vi kan kontakte deg.</p>
                </div>
              </div>
              <div className="c-step-card">
                <div className="c-step-num">3</div>
                <div>
                  <h4 className="font-bold text-sm text-[#EEF2F8]">Få automatisk tilgang</h4>
                  <p className="text-xs text-[#8B9EC7] mt-0.5">Når matchen er bekreftet i systemet, sendes invite og VIP-roller ut.</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-rgba(255,255,255,0.02) border border-rgba(255,255,255,0.05) text-xs text-[#8B9EC7] leading-relaxed">
              ⚠️ <strong>Risikoadvarsel:</strong> Trading innebærer høy risiko for tap og passer ikke for alle. Fence Trading leverer signaler og opplæring, ikke finansiell rådgivning. Vi mottar provisjonskompensasjon fra meglere.
            </div>
          </div>

          {/* RIGHT SIDE: Verification Form */}
          <div className="card p-6 md:p-8 reveal d1" style={{ background: "rgba(10, 16, 28, 0.7)" }}>
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <div>
                <h3 className="text-xl font-bold text-[#EEF2F8]">Registreringsskjema</h3>
                <p className="text-xs text-[#8B9EC7] mt-1">Svar innen få timer på hverdager</p>
              </div>
              <a
                href={affiliateUrl}
                target="_blank"
                className="btn btn-p"
                style={{ padding: "10px 20px", fontSize: "13.5px" }}
              >
                1. Registrer meg
              </a>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block mb-2 text-xs font-bold tracking-wider text-[#8B9EC7] uppercase">Fullt navn hos megler *</label>
                <input
                  type="text"
                  required
                  placeholder="Ola Nordmann"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block mb-2 text-xs font-bold tracking-wider text-[#8B9EC7] uppercase">Land *</label>
                  <input
                    type="text"
                    required
                    placeholder="Norge"
                    value={form.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-xs font-bold tracking-wider text-[#8B9EC7] uppercase">E-post registrert hos megler *</label>
                  <input
                    type="email"
                    required
                    placeholder="deg@epost.no"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block mb-2 text-xs font-bold tracking-wider text-[#8B9EC7] uppercase">Discord Bruker ID (Valgfri)</label>
                  <input
                    type="text"
                    placeholder="18 sifre (f.eks. 12345...)"
                    value={form.discordUserId}
                    onChange={(e) => updateField("discordUserId", e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-xs font-bold tracking-wider text-[#8B9EC7] uppercase">Discord Brukernavn (Valgfri)</label>
                  <input
                    type="text"
                    placeholder="ole.nordmann eller brukernavn"
                    value={form.discordUsername}
                    onChange={(e) => updateField("discordUsername", e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-xs font-bold tracking-wider text-[#8B9EC7] uppercase">Telegram Brukernavn (Valgfri)</label>
                <input
                  type="text"
                  placeholder="@brukernavn"
                  value={form.telegramUsername}
                  onChange={(e) => updateField("telegramUsername", e.target.value)}
                  className="input-field"
                />
              </div>

              <p className="text-xs text-[#8B9EC7] leading-relaxed">
                * Vennligst oppgi enten Discord-info eller Telegram-brukernavn slik at vi kan gi deg tilgang og invitasjoner til de lukkede gruppene.
              </p>

              {message && (
                <div
                  className={`p-4 rounded-lg border text-sm ${
                    status === "success"
                      ? "border-[#10B981]/30 bg-[#10B981]/10 text-[#a7f3d0]"
                      : "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#fca5a5]"
                  }`}
                >
                  <div className="flex gap-2.5">
                    {status === "success" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 mt-0.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    <span>
                      {message}
                      {requestId ? ` Forespørsel ID: #${requestId}.` : ""}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="btn btn-p w-full"
                style={{ fontSize: "16px", padding: "16px" }}
              >
                {status === "loading" ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-black" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sender inn verifisering...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <polyline points="9 11 11 13 15 9" />
                    </svg>
                    Send inn til verifisering
                  </span>
                )}
              </button>
            </form>
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
