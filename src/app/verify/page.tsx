"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function VerifyPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const data = {
            email: formData.get("email"),
            tradeNationId: formData.get("tradeNationId"),
            discordUsername: formData.get("discordUsername"),
        };

        try {
            const response = await fetch("/api/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error("Failed to submit verification");

            setIsSuccess(true);
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Submission Received!</h1>
                    <p className="text-muted-foreground">
                        We have received your details. We will verify your registration with Trade Nation and send you an invite link to your email/Discord shortly.
                    </p>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                    >
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <header className="p-4 border-b border-border">
                <div className="container mx-auto">
                    <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full space-y-8"
                >
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold text-foreground">Verify Registration</h1>
                        <p className="text-muted-foreground">
                            Submit your details to get access to our premium community and signals.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border p-8 rounded-2xl shadow-xl">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-foreground">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                id="email"
                                required
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="tradeNationId" className="text-sm font-medium text-foreground">Trade Nation ID / Account Number</label>
                            <input
                                type="text"
                                name="tradeNationId"
                                id="tradeNationId"
                                required
                                placeholder="e.g. 12345678"
                                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                            <p className="text-xs text-muted-foreground">Found in your Trade Nation account settings.</p>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="discordUsername" className="text-sm font-medium text-foreground">Discord Username (Optional)</label>
                            <input
                                type="text"
                                name="discordUsername"
                                id="discordUsername"
                                placeholder="username#0000"
                                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    Submit for Verification
                                    <Send className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>
            </main>
        </div>
    );
}
