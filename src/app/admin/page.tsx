"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type PendingRegistration = {
  id: number;
  name: string;
  country: string | null;
  email: string;
  discord_user_id: string | null;
  discord_username: string | null;
  telegram_username: string | null;
  source: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

type VerifiedAffiliate = {
  user_id: string;
  name: string | null;
  country: string | null;
  email: string | null;
  discord_user_id: string | null;
  telegram_links_sent: string | null;
  registration_date: string | null;
  verified_at: string | null;
};

type AdminData = {
  pending: PendingRegistration[];
  verified: VerifiedAffiliate[];
  stats: {
    pending: number;
    rejected: number;
    other: number;
    verified: number;
  };
};

const emptyData: AdminData = {
  pending: [],
  verified: [],
  stats: {
    pending: 0,
    rejected: 0,
    other: 0,
    verified: 0,
  },
};

const emptyManualVerify = {
  id: "",
  tradeNationUserId: "",
  tradeNationName: "",
  tradeNationCountry: "",
  tradeNationRegistrationDate: "",
};

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [data, setData] = useState<AdminData>(emptyData);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [manualVerify, setManualVerify] = useState(emptyManualVerify);

  const pendingRows = useMemo(
    () => data.pending.filter((item) => item.status === "pending"),
    [data.pending]
  );

  const rejectedRows = useMemo(
    () => data.pending.filter((item) => item.status === "rejected"),
    [data.pending]
  );

  useEffect(() => {
    const storedToken = window.localStorage.getItem("fence_admin_token") || "";
    if (storedToken) {
      setToken(storedToken);
      setTokenInput(storedToken);
      void loadData(storedToken);
    }
  }, []);

  async function handleTokenSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextToken = tokenInput.trim();
    setToken(nextToken);
    window.localStorage.setItem("fence_admin_token", nextToken);
    await loadData(nextToken);
  }

  async function loadData(activeToken = token) {
    if (!activeToken) {
      setMessage("Legg inn admin-token først.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/admin/registrations", {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Kunne ikke hente admin-data.");
      }

      setData(payload);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Kunne ikke hente admin-data."
      );
    }
  }

  async function updateStatus(id: number, nextStatus: "pending" | "rejected") {
    setUpdatingId(id);
    setMessage("");

    try {
      const response = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Kunne ikke oppdatere status.");
      }

      await loadData(token);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Kunne ikke oppdatere status."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleManualVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = Number(manualVerify.id);

    if (!Number.isInteger(id) || id <= 0) {
      setMessage("Skriv inn en gyldig request ID.");
      return;
    }

    if (!manualVerify.tradeNationUserId.trim()) {
      setMessage("Trade Nation User ID mangler.");
      return;
    }

    setUpdatingId(id);
    setMessage("");

    try {
      const response = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          status: "verified",
          tradeNationUserId: manualVerify.tradeNationUserId,
          tradeNationName: manualVerify.tradeNationName,
          tradeNationCountry: manualVerify.tradeNationCountry,
          tradeNationRegistrationDate:
            manualVerify.tradeNationRegistrationDate,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Kunne ikke verifisere manuelt.");
      }

      setManualVerify(emptyManualVerify);
      await loadData(token);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Kunne ikke verifisere manuelt."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-8 w-8">
              <Image
                src="/logo.png"
                alt="Fence Trading Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Fence<span className="text-primary">Trading</span>
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbake
          </Link>
        </div>
      </header>

      <section className="container mx-auto space-y-8 px-4 py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              Admin
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Verifiseringer
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Se innsendte broker-verifiseringer fra nettsiden og Discord,
                og hold køen ren før automatisk matching tar over.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleTokenSubmit}
            className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-xl"
          >
            <input
              type="password"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="Admin-token"
              className="h-12 min-w-0 flex-1 rounded-lg border border-border bg-card px-4 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Hent
            </button>
          </form>
        </div>

        {message ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {message}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Venter" value={data.stats.pending} tone="primary" />
          <Stat label="Avvist" value={data.stats.rejected} tone="danger" />
          <Stat label="Andre" value={data.stats.other} tone="muted" />
          <Stat label="Verifisert" value={data.stats.verified} tone="success" />
        </div>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-5">
            <h2 className="text-xl font-bold">Manuell verifisering</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Bruk denne når du har sjekket en ventende forespørsel mot Trade Nation
              manuelt. Den flytter brukeren til verifiserte affiliates.
            </p>
          </div>
          <form
            onSubmit={handleManualVerify}
            className="grid gap-4 lg:grid-cols-[0.6fr_1fr_1fr_1fr_1fr_auto]"
          >
            <AdminInput
              label="Forespørsel ID"
              value={manualVerify.id}
              onChange={(value) =>
                setManualVerify((current) => ({ ...current, id: value }))
              }
              placeholder="12"
            />
            <AdminInput
              label="TN User ID"
              value={manualVerify.tradeNationUserId}
              onChange={(value) =>
                setManualVerify((current) => ({
                  ...current,
                  tradeNationUserId: value,
                }))
              }
              placeholder="Trade Nation ID"
            />
            <AdminInput
              label="TN-navn"
              value={manualVerify.tradeNationName}
              onChange={(value) =>
                setManualVerify((current) => ({
                  ...current,
                  tradeNationName: value,
                }))
              }
              placeholder="Valgfritt"
            />
            <AdminInput
              label="TN-land"
              value={manualVerify.tradeNationCountry}
              onChange={(value) =>
                setManualVerify((current) => ({
                  ...current,
                  tradeNationCountry: value,
                }))
              }
              placeholder="Valgfritt"
            />
            <AdminInput
              label="TN-reg dato"
              value={manualVerify.tradeNationRegistrationDate}
              onChange={(value) =>
                setManualVerify((current) => ({
                  ...current,
                  tradeNationRegistrationDate: value,
                }))
              }
              placeholder="Valgfritt"
            />
            <button
              type="submit"
              disabled={updatingId !== null}
              className="inline-flex h-12 items-center justify-center gap-2 self-end rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {updatingId !== null ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Verifiser
            </button>
          </form>
        </section>

        <section className="space-y-4">
          <SectionHeader
            title="Ventende forespørsler"
            count={pendingRows.length}
            action={
              <button
                type="button"
                onClick={() => loadData()}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/50"
              >
                <RefreshCw className="h-4 w-4" />
                Oppdater
              </button>
            }
          />
          <PendingTable
            rows={pendingRows}
            updatingId={updatingId}
            onReject={(id) => updateStatus(id, "rejected")}
            onRestore={(id) => updateStatus(id, "pending")}
          />
        </section>

        <section className="space-y-4">
          <SectionHeader title="Avviste forespørsler" count={rejectedRows.length} />
          <PendingTable
            rows={rejectedRows}
            updatingId={updatingId}
            onReject={(id) => updateStatus(id, "rejected")}
            onRestore={(id) => updateStatus(id, "pending")}
          />
        </section>

        <section className="space-y-4">
          <SectionHeader title="Verifiserte affiliates" count={data.verified.length} />
          <VerifiedTable rows={data.verified} />
        </section>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "danger" | "muted" | "success";
}) {
  const toneClass = {
    primary: "text-primary border-primary/30",
    danger: "text-red-300 border-red-500/30",
    muted: "text-muted-foreground border-border",
    success: "text-green-300 border-green-500/30",
  }[tone];

  return (
    <div className={`rounded-lg border bg-card p-5 ${toneClass}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm font-medium text-muted-foreground">{label}</div>
    </div>
  );
}

function AdminInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
      />
    </label>
  );
}

function SectionHeader({
  title,
  count,
  action,
}: {
  title: string;
  count: number;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{count} oppføringer</p>
      </div>
      {action}
    </div>
  );
}

function PendingTable({
  rows,
  updatingId,
  onReject,
  onRestore,
}: {
  rows: PendingRegistration[];
  updatingId: number | null;
  onReject: (id: number) => void;
  onRestore: (id: number) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState text="Ingen forespørsler her akkurat nå." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Navn</th>
              <th className="px-4 py-3">Land</th>
              <th className="px-4 py-3">E-post</th>
              <th className="px-4 py-3">Discord</th>
              <th className="px-4 py-3">Telegram</th>
              <th className="px-4 py-3">Kilde</th>
              <th className="px-4 py-3">Dato</th>
              <th className="px-4 py-3 text-right">Handling</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  #{row.id}
                </td>
                <td className="px-4 py-3 font-semibold">{row.name}</td>
                <td className="px-4 py-3">{row.country || "-"}</td>
                <td className="px-4 py-3">{row.email}</td>
                <td className="px-4 py-3">
                  {row.discord_user_id || row.discord_username || "-"}
                </td>
                <td className="px-4 py-3">{row.telegram_username || "-"}</td>
                <td className="px-4 py-3">{row.source || "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(row.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {row.status === "pending" ? (
                      <button
                        type="button"
                        onClick={() => onReject(row.id)}
                        disabled={updatingId === row.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-60"
                      >
                        {updatingId === row.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        Avvis
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRestore(row.id)}
                        disabled={updatingId === row.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-primary/30 px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
                      >
                        {updatingId === row.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Gjenopprett
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VerifiedTable({ rows }: { rows: VerifiedAffiliate[] }) {
  if (rows.length === 0) {
    return <EmptyState text="Ingen verifiserte affiliates i databasen ennå." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3">TN ID</th>
              <th className="px-4 py-3">Navn</th>
              <th className="px-4 py-3">Land</th>
              <th className="px-4 py-3">E-post</th>
              <th className="px-4 py-3">Discord ID</th>
              <th className="px-4 py-3">Verifisert</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.user_id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {row.user_id}
                </td>
                <td className="px-4 py-3 font-semibold">{row.name || "-"}</td>
                <td className="px-4 py-3">{row.country || "-"}</td>
                <td className="px-4 py-3">{row.email || "-"}</td>
                <td className="px-4 py-3">{row.discord_user_id || "-"}</td>
                <td className="px-4 py-3 text-green-300">
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {formatDate(row.verified_at)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("nb-NO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
