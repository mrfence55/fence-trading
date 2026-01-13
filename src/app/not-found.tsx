import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4 text-center space-y-4">
            <h1 className="text-4xl font-bold text-white">404</h1>
            <h2 className="text-xl font-semibold text-slate-400">Page Not Found</h2>
            <p className="text-slate-400 max-w-md">
                The page you are looking for does not exist or has been moved.
            </p>
            <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-600 transition-colors"
            >
                ← Back to Home
            </Link>
        </div>
    );
}
