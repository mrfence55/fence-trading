import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BarChart2, ExternalLink, ShieldCheck, Wrench } from "lucide-react";

const affiliateUrl =
  process.env.NEXT_PUBLIC_TRADENATION_AFFILIATE_URL ||
  "https://go.tradenation.com/visit/?bta=36145&brand=tradenation";

export default function PlatformsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <section className="container mx-auto space-y-10 px-4 py-12">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            <Wrench className="h-4 w-4" />
            Broker og verktøy
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            Verktøy for en ryddigere tradingflyt.
          </h1>
          <p className="text-muted-foreground">
            Fence Trading er bygget rundt broker-onboarding, TradingView-baserte
            rutiner, signalevaluering og utvalgte verktøy som støtter mer
            disiplinerte beslutninger.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <PlatformBlock
            icon={<ShieldCheck className="h-7 w-7 text-primary" />}
            title="Trade Nation"
            text="Broker-tilgang låser opp de viktigste fordelene i Fence Trading-fellesskapet. Les alltid produktrisiko, lokal kvalifikasjon og broker-vilkår før trading."
            action={
              <Link
                href={affiliateUrl}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Registrer
                <ExternalLink className="h-4 w-4" />
              </Link>
            }
          />
          <PlatformBlock
            icon={<BarChart2 className="h-7 w-7 text-accent" />}
            title="TradingView"
            text="Strategimateriell og indikatorflyt er bygget rundt ryddig chart-gjennomgang, repeterbare oppsett og strukturert planlegging."
          />
          <PlatformBlock
            icon={<Wrench className="h-7 w-7 text-primary" />}
            title="FlockTrade"
            text="FlockTrade kan bli et verktøy- og fordelslag for scannere, terminal-lignende research og verdi i fellesskapet før en eventuell white-label-avgjørelse."
          />
        </div>

        <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
          Fence Trading kan motta affiliate-kompensasjon. Innholdet er
          opplærende og ikke finansiell rådgivning. Trading i CFD-er og
          leveraged produkter innebærer betydelig risiko.
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

function PlatformBlock({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-background">
        {icon}
      </div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
