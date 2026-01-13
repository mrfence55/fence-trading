'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('App Error:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4 text-center space-y-4">
            <h2 className="text-2xl font-bold text-white">Something went wrong!</h2>
            <p className="text-slate-400 max-w-md">
                An unexpected error occurred. Please try again.
            </p>
            <button
                onClick={() => reset()}
                className="px-6 py-3 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-600 transition-colors"
            >
                Try Again
            </button>
        </div>
    );
}
