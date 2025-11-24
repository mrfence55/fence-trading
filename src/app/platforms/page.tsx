"use client";

import { motion } from "framer-motion";
import { ArrowRight, BarChart2, Check, Download, ExternalLink, Layers, Monitor, Shield, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function PlatformsPage() {
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
                        <Link href="/platforms" className="text-primary font-semibold">Platforms</Link>
                        <Link href="/#services" className="hover:text-primary transition-colors">Services</Link>
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
                            Trade Your Way with <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                                World-Class Platforms
                            </span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12"
                        >
                            Whether you're a scalper, a swing trader, or an algo developer, we have the perfect environment for you.
                        </motion.p>
                    </div>
                </section>

                {/* TradingView Section */}
                <section className="py-20 border-y border-border bg-card/30">
                    <div className="container mx-auto px-4">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="space-y-8"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-[#131722] rounded-xl border border-border">
                                        <BarChart2 className="w-8 h-8 text-primary" />
                                    </div>
                                    <h2 className="text-3xl md:text-4xl font-bold">TradingView Integration</h2>
                                </div>

                                <p className="text-lg text-muted-foreground">
                                    The world's most popular charting platform, now fully integrated with Trade Nation. Analyze, chart, and trade directly from one interface.
                                </p>

                                <div className="space-y-4">
                                    <FeatureItem text="Drag & Drop Risk Management (SL/TP)" />
                                    <FeatureItem text="85+ Technical Indicators & Drawing Tools" />
                                    <FeatureItem text="Pine Script for Custom Strategies" />
                                    <FeatureItem text="Deep Backtesting Capabilities" />
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    <Link
                                        href="https://www.tradingview.com/black-friday/?share_your_love=oscar_gjerde"
                                        target="_blank"
                                        className="px-8 py-4 bg-[#131722] text-white border border-border hover:border-primary/50 font-bold rounded-xl transition-all flex items-center gap-2"
                                    >
                                        Get TradingView Pro
                                        <ExternalLink className="w-4 h-4" />
                                    </Link>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden border border-border shadow-2xl"
                            >
                                <Image
                                    src="/images/tradingview-connect.png"
                                    alt="TradingView Integration with Trade Nation"
                                    fill
                                    className="object-cover object-left-top"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                                <div className="absolute bottom-6 left-6 right-6">
                                    <div className="bg-background/90 backdrop-blur border border-border p-4 rounded-xl">
                                        <h3 className="font-bold text-lg mb-1">Direct Integration</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Connect Trade Nation directly within the TradingView panel.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Fence Strategy Product */}
                <section className="py-20">
                    <div className="container mx-auto px-4">
                        <div className="bg-gradient-to-br from-primary/10 to-accent/5 rounded-3xl p-8 md:p-12 border border-primary/20">
                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                <div className="relative h-[300px] md:h-[400px] w-full">
                                    <Image
                                        src="/images/strategy-cover.png"
                                        alt="Fence Strategy Product"
                                        fill
                                        className="object-contain drop-shadow-2xl"
                                    />
                                </div>
                                <div className="space-y-6">
                                    <div className="inline-block px-3 py-1 bg-primary/20 text-primary text-sm font-bold rounded-full">
                                        Exclusive Product
                                    </div>
                                    <h2 className="text-3xl md:text-4xl font-bold">The Fence Strategy</h2>
                                    <p className="text-lg text-muted-foreground">
                                        Get the exact system we use to generate our signals. Includes the full PDF guide and the custom Pine Script indicator for TradingView.
                                    </p>
                                    <ul className="space-y-3">
                                        <li className="flex items-center gap-2 text-foreground">
                                            <Check className="w-5 h-5 text-primary" />
                                            <span>Proprietary Trend Detection</span>
                                        </li>
                                        <li className="flex items-center gap-2 text-foreground">
                                            <Check className="w-5 h-5 text-primary" />
                                            <span>Automated Buy/Sell Alerts</span>
                                        </li>
                                        <li className="flex items-center gap-2 text-foreground">
                                            <Check className="w-5 h-5 text-primary" />
                                            <span>Risk Management Rules PDF</span>
                                        </li>
                                    </ul>
                                    <button className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2">
                                        Buy Strategy ($199)
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CloudTrade & MT4 Grid */}
                <section className="py-20 border-t border-border">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* CloudTrade */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="bg-card border border-border rounded-2xl overflow-hidden group hover:border-primary/50 transition-all"
                            >
                                <div className="relative h-64 overflow-hidden">
                                    <Image
                                        src="/images/cloudtrade-desktop.png"
                                        alt="CloudTrade Interface"
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <Zap className="w-16 h-16 text-white/80" />
                                    </div>
                                </div>
                                <div className="p-8 space-y-4">
                                    <h3 className="text-2xl font-bold">CloudTrade</h3>
                                    <p className="text-muted-foreground">
                                        Built for speed. A lightweight, browser-based platform designed for scalpers who need instant execution without the bloat.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge text="Ultra-Low Latency" />
                                        <Badge text="One-Click Trading" />
                                        <Badge text="No Install Required" />
                                    </div>
                                </div>
                            </motion.div>

                            {/* MT4 */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 }}
                                className="bg-card border border-border rounded-2xl overflow-hidden group hover:border-primary/50 transition-all"
                            >
                                <div className="relative h-64 bg-[#1a1a1a] flex items-center justify-center">
                                    <div className="text-center">
                                        <Layers className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
                                        <span className="text-2xl font-bold text-muted-foreground">MetaTrader 4</span>
                                    </div>
                                </div>
                                <div className="p-8 space-y-4">
                                    <h3 className="text-2xl font-bold">MetaTrader 4</h3>
                                    <p className="text-muted-foreground">
                                        The industry standard. Perfect for traders who rely on Expert Advisors (EAs) and custom automated strategies.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge text="EA Compatible" />
                                        <Badge text="Advanced Charting" />
                                        <Badge text="Mobile App" />
                                    </div>
                                </div>
                            </motion.div>
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

function FeatureItem({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-4 h-4 text-primary" />
            </div>
            <span className="text-foreground font-medium">{text}</span>
        </div>
    );
}

function Badge({ text }: { text: string }) {
    return (
        <span className="px-3 py-1 bg-muted text-muted-foreground text-xs font-bold rounded-full border border-border">
            {text}
        </span>
    );
}
