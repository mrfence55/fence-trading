"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">404</h1>
            <h2 className="text-xl font-semibold text-muted-foreground">Page Not Found</h2>
            <p className="text-muted-foreground max-w-md">
                The page you are looking for does not exist or has been moved.
            </p>
            <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
            </Link>
        </div>
    );
}
