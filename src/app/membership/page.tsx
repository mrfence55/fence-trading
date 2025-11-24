"use client";

import { motion } from "framer-motion";
import { Check, Shield, Star, Zap, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function MembershipPage() {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Navigation */}
            <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="relative w-8 h-8">
                            <Image src="/logo.png" alt="Fence Trading Logo" fill className="object-contain" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-foreground">
                            Fence<span className="text-primary">Trading</span>
                        </span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
                        <Link href="/" className="hover:text-primary transition-colors">Home</Link>
                        <Link href="/platforms" className="hover:text-primary transition-colors">Platforms</Link>
                        <Link href="/membership" className="text-primary font-semibold">Membership</Link>
                    </nav>
                    <div className="flex items-center gap-4">
                        <Link
                            href="https://go.tradenation.com/visit/?bta=36145&brand=tradenation"
                            target="_blank"
                            className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                        >
                            Join Now
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1 pt-16">
                {/* Hero Section */}
                <section className="relative py-20 overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
                    <div className="container mx-auto px-4 relative z-10 text-center">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-6xl font-bold mb-6"
                        >
                            Choose Your Path to <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                                Profitability
                            </span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12"
                        >
                            Join thousands of traders winning daily. Select the plan that fits your trading journey.
                        </motion.p>
                    </div>
                </section>

                {/* Pricing Cards */}
                <section className="pb-20">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">

                            {/* Free Tier */}
                            <PricingCard
                                title="Free Access"
                                price="Free"
                                description="Get a taste of our winning signals and community results."
                                icon={<Users className="w-8 h-8 text-foreground" />}
                                features={[
                                    "Access to Public Telegram",
                                    "Daily Result Updates",
                                    "Occasional Free Signals",
                                    "Market News & Analysis"
                                ]}
                                ctaText="Join Telegram"
                                ctaLink="https://t.me/FreeFenceTrading"
                                ctaVariant="outline"
                            />

                            {/* VIP Subscription */}
                            <PricingCard
                                title="VIP Subscription"
                                price="$20"
                                period="/ month"
                                description="Full access to all premium signals and strategies."
                                icon={<Star className="w-8 h-8 text-accent" />}
                                features={[
                                    "ALL Premium Signals (TP1-TP4)",
                                    "Full Risk Management Guide",
                                    "Priority Support",
                                    "Exclusive Community Chat",
                                    "Weekly Strategy Calls"
                                ]}
                                ctaText="Subscribe Now"
                                ctaLink="#" // Placeholder for payment link
                                ctaVariant="secondary"
                                popular={false}
                            />

                            {/* Affiliate Access (Best Value) */}
                            <PricingCard
                                title="Affiliate Access"
                                price="FREE"
                                period="with Trade Nation"
                                description="Get everything in VIP for FREE by trading with our partner."
                                icon={<Shield className="w-8 h-8 text-primary" />}
                                features={[
                                    "Everything in VIP Subscription",
                                    "Zero Monthly Fees",
                                    "Access to CloudTrade Platform",
                                    "TradingView Integration",
                                    "Institutional Spreads"
                                ]}
                                ctaText="Register & Verify"
                                ctaLink="/verify"
                                ctaVariant="primary"
                                popular={true}
                            />

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

function PricingCard({
    title,
    price,
    period,
    description,
    icon,
    features,
    ctaText,
    ctaLink,
    ctaVariant,
    popular
}: {
    title: string,
    price: string,
    period?: string,
    description: string,
    icon: React.ReactNode,
    features: string[],
    ctaText: string,
    ctaLink: string,
    ctaVariant: 'primary' | 'secondary' | 'outline',
    popular?: boolean
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={cn(
                "relative p-8 rounded-2xl border flex flex-col h-full transition-all hover:scale-[1.02]",
                popular
                    ? "bg-card border-primary shadow-[0_0_30px_rgba(6,182,212,0.15)]"
                    : "bg-card/50 border-border"
            )}
        >
            {popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full shadow-lg">
                    Best Value
                </div>
            )}

            <div className="mb-6">
                <div className="mb-4 p-3 rounded-xl bg-background w-fit border border-border">
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">{price}</span>
                    {period && <span className="text-muted-foreground">{period}</span>}
                </div>
                <p className="text-muted-foreground mt-4 text-sm">{description}</p>
            </div>

            <div className="flex-1 space-y-4 mb-8">
                {features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <Check className={cn("w-5 h-5 shrink-0", popular ? "text-primary" : "text-muted-foreground")} />
                        <span className="text-sm text-foreground/90">{feature}</span>
                    </div>
                ))}
            </div>

            <Link
                href={ctaLink}
                className={cn(
                    "w-full py-4 rounded-xl font-bold text-center transition-all flex items-center justify-center gap-2",
                    ctaVariant === 'primary' && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(6,182,212,0.3)]",
                    ctaVariant === 'secondary' && "bg-accent text-accent-foreground hover:bg-accent/90",
                    ctaVariant === 'outline' && "border border-border hover:bg-muted text-foreground"
                )}
            >
                {ctaText}
                {ctaVariant === 'primary' && <Zap className="w-4 h-4" />}
            </Link>
        </motion.div>
    );
}
