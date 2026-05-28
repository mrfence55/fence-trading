import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CheckCircle2, Lock, ShieldCheck, Sparkles } from "lucide-react";

export default function MembershipPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <section className="container mx-auto space-y-10 px-4 py-12">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            <Lock className="h-4 w-4" />
            Medlemskap
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            Tilgang bygget rundt verifisering og langsiktig verdi i fellesskapet.
          </h1>
          <p className="text-muted-foreground">
            Første versjon holder hovedfellesskapet gratis etter broker-
            verifisering, med betalt strategimateriell og fremtidige
            verktøyfordeler som tillegg.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <MembershipBlock
            icon={<ShieldCheck className="h-7 w-7 text-primary" />}
            title="Verifisert tilgang"
            label="Inkludert"
            items={[
              "Tilgang til Discord-fellesskap",
              "Telegram-kanaler for signaler",
              "Arkiv for signalresultater",
              "Mulighet til å delta i challenges",
            ]}
          />
          <MembershipBlock
            icon={<Sparkles className="h-7 w-7 text-accent" />}
            title="Strategitillegg"
            label="Planlagt"
            items={[
              "Tilgang til TradingView-indikator",
              "Oppsettsguide og regler",
              "Eksempler og FAQ",
              "Strategioppdateringer",
            ]}
          />
          <MembershipBlock
            icon={<Lock className="h-7 w-7 text-primary" />}
            title="Pro-verktøy"
            label="Senere"
            items={[
              "FlockTrade-fordeler",
              "Research-flyt",
              "Avanserte dashboards",
              "Private events",
            ]}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/verify"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Verifiser tilgang
          </Link>
          <Link
            href="/performance"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition-colors hover:border-primary/50"
          >
            Se resultater
          </Link>
        </div>
      </section>
    </main>
  );
}

function Header() {
  return (
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
  );
}

function MembershipBlock({
  icon,
  title,
  label,
  items,
}: {
  icon: ReactNode;
  title: string;
  label: string;
  items: string[];
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-background">
          {icon}
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          {label}
        </span>
      </div>
      <h2 className="text-xl font-bold">{title}</h2>
      <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
