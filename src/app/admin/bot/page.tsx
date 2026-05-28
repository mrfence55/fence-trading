"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

export default function AdminBotPage() {
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [statusData, setStatusData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Telegram sign-in form state
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [tfaPassword, setTfaPassword] = useState("");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [loginStep, setLoginStep] = useState<"phone" | "code" | "tfa">("phone");
  
  // Logs console state
  const [activeApp, setActiveApp] = useState("fence-bot");
  const [logs, setLogs] = useState("");
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Load password from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("admin_password");
    if (saved) {
      setPassword(saved);
      verifyAdmin(saved);
    }
  }, []);

  // Poll status data every 8 seconds if authorized
  useEffect(() => {
    if (!isAuthorized) return;
    
    fetchStatus();
    fetchLogs();
    
    const interval = setInterval(() => {
      fetchStatus();
    }, 8000);
    
    return () => clearInterval(interval);
  }, [isAuthorized, activeApp]);

  // Scroll logs console to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  async function verifyAdmin(pwd: string) {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${pwd}`
        },
        body: JSON.stringify({ action: "status" })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ugyldig passord");
      }
      
      setStatusData(data);
      setIsAuthorized(true);
      localStorage.setItem("admin_password", pwd);
    } catch (e: any) {
      setError(e.message || "Ugyldig passord. Prøv igjen.");
      setIsAuthorized(false);
      localStorage.removeItem("admin_password");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchStatus() {
    try {
      const res = await fetch("/api/admin/bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${password}`
        },
        body: JSON.stringify({ action: "status" })
      });
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
      }
    } catch (e) {
      console.error("Error fetching status:", e);
    }
  }

  async function fetchLogs() {
    setIsLoadingLogs(true);
    try {
      const res = await fetch("/api/admin/bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${password}`
        },
        body: JSON.stringify({ action: "logs", app: activeApp })
      });
      if (res.ok) {
        const text = await res.text();
        setLogs(text || "Ingen logger tilgjengelig.");
      }
    } catch (e) {
      setLogs("Klarte ikke hente logger.");
    } finally {
      setIsLoadingLogs(false);
    }
  }

  // Telegram Login Step 1: Send phone number
  async function handleSendPhone(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMsg("");
    
    try {
      const res = await fetch("/api/admin/bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${password}`
        },
        body: JSON.stringify({ action: "connect", phone })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tilkobling feilet");
      
      setPhoneCodeHash(data.phone_code_hash);
      setLoginStep("code");
      setSuccessMsg("Loginkode er sendt til din Telegram-app!");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Telegram Login Step 2: Verify code
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMsg("");
    
    try {
      const res = await fetch("/api/admin/bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${password}`
        },
        body: JSON.stringify({
          action: "verify",
          phone,
          code,
          phone_code_hash: phoneCodeHash,
          password: tfaPassword
        })
      });
      
      const data = await res.json();
      
      // Handle 2FA required
      if (res.status === 401 && data.error === "TOFA_PAREKREVD") {
        setLoginStep("tfa");
        setSuccessMsg(data.message);
        return;
      }
      
      if (!res.ok) throw new Error(data.error || "Koden ble avvist");
      
      setSuccessMsg("Hurra! Innlogging fullført og Telegram-sesjon lagret!");
      setLoginStep("phone");
      setPhone("");
      setCode("");
      setTfaPassword("");
      fetchStatus();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  // PM2 Process Commands: Restart, Stop, Start
  async function handleProcessCommand(app: string, subAction: "restart" | "stop" | "start") {
    try {
      const res = await fetch("/api/admin/bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${password}`
        },
        body: JSON.stringify({ action: "process", subAction, app })
      });
      if (res.ok) {
        setSuccessMsg(`Kommando '${subAction}' sendt til ${app}!`);
        setTimeout(() => fetchStatus(), 1000);
      }
    } catch (e) {
      console.error("Action failed:", e);
    }
  }

  // Logout admin dashboard
  function handleLogout() {
    setIsAuthorized(false);
    setPassword("");
    localStorage.removeItem("admin_password");
    setStatusData(null);
  }

  // RENDER: PASSWORD PROTECTION GATEWAY
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#060A12] text-[#EEF2F8] p-4">
        {/* Style tag for consistency */}
        <style dangerouslySetInnerHTML={{ __html: `
          body::before {
            content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
            opacity: .4;
          }
          .gt {
            background: linear-gradient(125deg, #38BDF8 0%, #06B6D4 35%, #D4AF37 75%, #F59E0B 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          }
        ` }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.06),transparent_60%)] pointer-events-none" />
        
        <div className="w-full max-w-md p-8 rounded-2xl border border-white/5 bg-[#0C1422]/80 backdrop-blur shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative z-10 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 mb-6">
            <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-cyan-400 stroke-2 fill-none"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-2">Fence<span className="text-cyan-400">Trading</span></h1>
          <p className="text-xs text-[#8B9EC7] mb-8 uppercase tracking-wider font-bold">Bot Kontrollpanel Gateway</p>
          
          <form onSubmit={(e) => { e.preventDefault(); verifyAdmin(password); }} className="space-y-4 text-left">
            <div>
              <label className="block mb-2 text-xs font-bold tracking-wider text-[#8B9EC7] uppercase">Admin-passord</label>
              <input
                type="password"
                placeholder="Skriv inn passord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 rounded-lg border border-white/5 bg-[#060a12]/80 px-4 text-[#EEF2F8] outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-black font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50"
            >
              {isLoading ? "Laster status..." : "Lås opp dashboard"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // RENDER: FULL ADMIN DASHBOARD
  const tgAuthorized = statusData?.telegram?.authorized ?? false;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#060A12] text-[#EEF2F8]">
      <style dangerouslySetInnerHTML={{ __html: `
        body::before {
          content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
          opacity: .4;
        }
        .gt {
          background: linear-gradient(125deg, #38BDF8 0%, #06B6D4 35%, #D4AF37 75%, #F59E0B 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .card {
          background: rgba(15, 24, 38, 0.7); backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, .06); border-radius: 16px;
        }
        .btn-p {
          background: linear-gradient(135deg, #22D3EE, #06B6D4); color: #000;
          box-shadow: 0 0 20px rgba(6, 182, 212, .2);
        }
        .btn-o {
          background: rgba(255, 255, 255, .04); color: var(--text);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .input-field {
          width: 100%; height: 48px; border-radius: 8px;
          background: rgba(6, 10, 18, 0.7); border: 1px solid rgba(255,255,255,0.06);
          color: #EEF2F8; padding: 0 16px; font-size: 14.5px; outline: none;
        }
        .input-field:focus {
          border-color: rgba(6, 182, 212, 0.4);
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.15);
        }
      ` }} />

      {/* Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/3 rounded-full filter blur-[90px] pointer-events-none" />

      {/* HEADER */}
      <header className="border-b border-white/5 bg-[#060A12]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="logo-box" style={{ width: "32px", height: "32px", borderRadius: "8px" }}>
              <svg viewBox="0 0 24 24" style={{ width: "17px", height: "17px" }}>
                <polyline points="3 3 3 21 21 21" />
                <polyline points="7 16 11 12 15 16 21 10" />
              </svg>
            </div>
            <span className="text-lg font-black tracking-tight">
              Fence<span className="text-cyan-400">Admin</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#8B9EC7] font-bold uppercase tracking-wider bg-white/5 px-3 py-1.5 rounded-full">
              Status: {tgAuthorized ? "🟢 TILKOBLET" : "🔴 LOGGET UT"}
            </span>
            <button
              onClick={handleLogout}
              className="btn btn-o"
              style={{ padding: "6px 14px", fontSize: "12px", borderRadius: "6px" }}
            >
              Logg ut panel
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD GRID */}
      <main className="container mx-auto px-4 py-8 relative z-10 flex-1 space-y-6">
        {/* Banner Success/Error */}
        {(successMsg || error) && (
          <div
            className={`p-4 rounded-xl border text-sm flex justify-between items-center ${
              successMsg
                ? "border-[#10B981]/30 bg-[#10B981]/10 text-[#a7f3d0]"
                : "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#fca5a5]"
            }`}
          >
            <div className="flex gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 mt-0.5">
                {successMsg ? <polyline points="20 6 9 17 4 12" /> : <circle cx="12" cy="12" r="10" />}
              </svg>
              <span>{successMsg || error}</span>
            </div>
            <button
              onClick={() => { setSuccessMsg(""); setError(""); }}
              className="text-[#8B9EC7] hover:text-white ml-4 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: STATUS & TERMINAL LOGIN (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* CARD 1: TELEGRAM SESSION STATUS */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-[#EEF2F8] mb-4">Telegram-tilkobling</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-sm text-[#8B9EC7]">Sesjonsstatus:</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${tgAuthorized ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                    {statusData?.telegram?.status || "Laster..."}
                  </span>
                </div>
                
                {/* IN-SITE TELEGRAM LOGIN FORM (Only shown if NOT authorized) */}
                {!tgAuthorized && (
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                    <div className="text-xs text-amber-400 font-bold bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 leading-relaxed">
                      ⚠️ Sesjonen er inaktiv! Følg trinnene under for å koble til Telegram igjen uten å logge inn på serveren.
                    </div>
                    
                    {loginStep === "phone" && (
                      <form onSubmit={handleSendPhone} className="space-y-3">
                        <div>
                          <label className="block mb-1.5 text-xs font-bold text-[#8B9EC7] uppercase">Telefonnummer (med +47)</label>
                          <input
                            type="text"
                            required
                            placeholder="+4799988777"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="btn btn-p w-full"
                          style={{ padding: "10px", fontSize: "13.5px", borderRadius: "8px" }}
                        >
                          {isLoading ? "Sender..." : "Send loginkode"}
                        </button>
                      </form>
                    )}

                    {(loginStep === "code" || loginStep === "tfa") && (
                      <form onSubmit={handleVerifyCode} className="space-y-3">
                        <div>
                          <label className="block mb-1.5 text-xs font-bold text-[#8B9EC7] uppercase">Loginkode fra Telegram</label>
                          <input
                            type="text"
                            required
                            placeholder="Skriv inn kode (f.eks. 12345)"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="input-field"
                            autoComplete="one-time-code"
                          />
                        </div>

                        {loginStep === "tfa" && (
                          <div>
                            <label className="block mb-1.5 text-xs font-bold text-[#8B9EC7] uppercase">Tofaktor-passord (2FA)</label>
                            <input
                              type="password"
                              required
                              placeholder="Ditt 2FA-passord"
                              value={tfaPassword}
                              onChange={(e) => setTfaPassword(e.target.value)}
                              className="input-field"
                            />
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setLoginStep("phone")}
                            className="btn btn-o flex-1"
                            style={{ padding: "10px", fontSize: "13px", borderRadius: "8px" }}
                          >
                            Avbryt
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-p flex-1"
                            style={{ padding: "10px", fontSize: "13px", borderRadius: "8px" }}
                          >
                            {isLoading ? "Logger inn..." : "Bekreft og logg inn"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
                
                {tgAuthorized && (
                  <div className="text-xs text-green-400 font-bold bg-green-500/10 p-3 rounded-lg border border-green-500/20 text-center">
                    ✅ Telegram-tilkoblingen fungerer utmerket! Signalene skrapes og videresendes automatisk.
                  </div>
                )}
              </div>
            </div>

            {/* CARD 2: PM2 PROCESSES HEALTH */}
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-[#EEF2F8]">Prosess-overvåking</h3>
                <span className="text-[10px] text-faint uppercase font-bold tracking-wider">PM2 Integrasjon</span>
              </div>
              
              <div className="space-y-4">
                {statusData?.pm2 ? (
                  Object.entries(statusData.pm2).map(([name, app]: any) => (
                    <div className="p-3.5 rounded-xl bg-white/2 border border-white/5 flex flex-col gap-2" key={name}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-white">{name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          app.status === "online" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                        }`}>
                          {app.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-[11px] text-[#8B9EC7] border-y border-white/5 py-2 font-mono">
                        <div>CPU: {app.cpu}%</div>
                        <div>RAM: {(app.memory / 1024 / 1024).toFixed(0)}MB</div>
                        <div>Restarts: {app.restarts}</div>
                      </div>

                      <div className="flex gap-2 justify-end mt-1">
                        <button
                          onClick={() => handleProcessCommand(name, "restart")}
                          className="px-2.5 py-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] font-bold tracking-wide uppercase transition-all"
                        >
                          Restart
                        </button>
                        <button
                          onClick={() => handleProcessCommand(name, "stop")}
                          className="px-2.5 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold tracking-wide uppercase transition-all"
                        >
                          Stopp
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#8B9EC7] text-center py-4">Sjekker PM2 app-status...</p>
                )}
              </div>
            </div>
          </div>
          
          {/* RIGHT: LIVE TERMINAL LOG CONSOLE (7 cols) */}
          <div className="lg:col-span-7 card p-6 flex flex-col" style={{ minHeight: "580px" }}>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#EEF2F8]">Live Terminal Logs</h3>
                <p className="text-xs text-[#8B9EC7] mt-0.5">Siste 100 linjer for valgt PM2 prosess</p>
              </div>
              
              <div className="flex gap-2 items-center">
                <select
                  value={activeApp}
                  onChange={(e) => setActiveApp(e.target.value)}
                  className="bg-[#060a12]/80 border border-white/10 rounded-lg text-xs font-bold text-[#EEF2F8] px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="fence-bot">fence-bot (watcher)</option>
                  <option value="fence-relay">fence-relay (relay)</option>
                  <option value="fence-affiliate">fence-affiliate</option>
                  <option value="fence-admin">fence-admin</option>
                </select>
                
                <button
                  onClick={fetchLogs}
                  disabled={isLoadingLogs}
                  className="btn btn-o"
                  style={{ padding: "8px 12px", fontSize: "11.5px", borderRadius: "6px" }}
                >
                  {isLoadingLogs ? "Laster..." : "Oppdater"}
                </button>
              </div>
            </div>
            
            {/* Terminal Box */}
            <div className="flex-1 bg-[#03060B] border border-white/5 rounded-xl p-4 font-mono text-[11px] text-[#A7F3D0]/80 overflow-y-auto leading-relaxed relative flex flex-col h-[400px]">
              {isLoadingLogs && (
                <div className="absolute inset-0 bg-[#03060B]/80 flex items-center justify-center backdrop-blur-sm rounded-xl">
                  <div className="flex items-center gap-2.5 text-xs text-[#A7F3D0]">
                    <svg className="animate-spin h-4 w-4 text-[#A7F3D0]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Henter logger fra server...
                  </div>
                </div>
              )}
              <pre className="whitespace-pre-wrap flex-1 overflow-x-auto pb-4">
                {logs}
              </pre>
              <div ref={consoleEndRef} />
            </div>
          </div>
          
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-white/5 bg-[#0A101C] mt-auto">
        <div className="container text-center text-xs text-[#8B9EC7]">
          <p>© {new Date().getFullYear()} Fence Trading. Alle rettigheter forbeholdt. Partner av Trade Nation.</p>
        </div>
      </footer>
    </div>
  );
}
