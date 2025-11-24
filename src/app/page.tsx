"use client";

import { motion } from "framer-motion";
import { ArrowRight, BarChart2, Shield, Zap, Users, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SignalTicker } from "@/components/SignalTicker";
import { PerformanceStats } from "@/components/PerformanceStats";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <Image src="/logo.png" alt="Fence Trading Logo" fill className="object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Fence<span className="text-primary">Trading</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="#performance" className="hover:text-primary transition-colors">Results</Link>
            <Link href="/platforms" className="hover:text-primary transition-colors">Broker & Platforms</Link>
            <Link href="/membership" className="hover:text-primary transition-colors">Membership</Link>
            <Link href="#services" className="hover:text-primary transition-colors">Services</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="#join"
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              Join Now
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground">
                  Master the Markets with <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                    Fence Trading
                  </span>
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
              >
                The ultimate governance platform for serious traders.
                Get exclusive access to premium signals, automated copy trading, and a community of winners.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link
                  href="https://go.tradenation.com/visit/?bta=36145&brand=tradenation"
                  target="_blank"
                  className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground text-lg font-bold rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2"
                >
                  Start Trading
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="#verify"
                  className="w-full sm:w-auto px-8 py-4 bg-card border border-border text-foreground text-lg font-semibold rounded-xl hover:bg-muted transition-all flex items-center justify-center gap-2"
                >
                  <Shield className="w-5 h-5 text-accent" />
                  Verify Access
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Signal Ticker & Stats */}
        <section id="performance" className="pb-20 space-y-12">
          <SignalTicker />
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-2">Live Performance</h2>
            <p className="text-muted-foreground mb-8">Real-time results from our premium signal channel.</p>
            <PerformanceStats />
          </div>
        </section>

        {/* Broker Showcase */}
        <section id="broker" className="py-20 bg-card/50 border-y border-border">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Powered by <span className="text-primary">Trade Nation</span></h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We partner with the best to give you the edge. Experience lightning-fast execution and seamless TradingView integration.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Zap className="w-10 h-10 text-accent" />}
                title="Cloud Trade Execution"
                description="Ultra-low latency execution designed for scalpers and day traders. Never miss a pip."
              />
              <FeatureCard
                icon={<BarChart2 className="w-10 h-10 text-primary" />}
                title="TradingView Integration"
                description="Trade directly from your charts. The world's best charting platform meets the world's best execution."
              />
              <FeatureCard
                icon={<Lock className="w-10 h-10 text-accent" />}
                title="Secure & Regulated"
                description="Trade with confidence. Your funds are segregated and protected by top-tier regulation."
              />
            </div>
          </div>
        </section>

        {/* Services / Value Prop */}
        <section id="services" className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <h2 className="text-3xl md:text-4xl font-bold">
                  Unlock Premium <span className="text-accent">Benefits</span>
                </h2>
                <div className="space-y-6">
                  <ServiceItem
                    title="Exclusive Signals"
                    description="Get high-probability setups delivered straight to your device. Free for registered affiliates."
                  />
                  <ServiceItem
                    title="Copy Trading"
                    description="Automate your success. Copy our top strategies directly to your account (Coming Soon)."
                  />
                  <ServiceItem
                    title="Strategy Shop"
                    description="Access our proprietary TradingView indicators and strategies to level up your own analysis."
                  />
                </div>
              </div>
              <div className="relative h-[400px] lg:h-[500px] rounded-2xl overflow-hidden border border-border bg-card/50 p-8 flex items-center justify-center">
                {/* Placeholder for a dashboard screenshot or abstract graphic */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
                <div className="text-center space-y-4 relative z-10">
                  <Users className="w-20 h-20 text-primary mx-auto opacity-50" />
                  <h3 className="text-2xl font-bold text-foreground">Join the Community</h3>
                  <p className="text-muted-foreground">Thousands of traders are already winning with Fence Trading.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA / Verification Teaser */}
        <section id="verify" className="py-20 bg-primary/5 border-t border-border">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Join?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Register with Trade Nation using our link, then verify your account to get instant access to our Discord and Signals.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="https://go.tradenation.com/visit/?bta=36145&brand=tradenation"
                target="_blank"
                className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all"
              >
                1. Register Now
              </Link>
              <Link
                href="/verify"
                className="px-8 py-4 bg-card border border-border text-foreground font-bold rounded-xl hover:bg-muted transition-all"
              >
                2. Verify Registration
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-border bg-card">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} Fence Trading. All rights reserved.</p>
          <p className="mt-2">Trading involves risk. Please trade responsibly.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-background border border-border hover:border-primary/50 transition-colors group">
      <div className="mb-4 p-3 rounded-xl bg-card w-fit group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function ServiceItem({ title, description }: { title: string, description: string }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1">
        <div className="w-2 h-2 rounded-full bg-accent" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
