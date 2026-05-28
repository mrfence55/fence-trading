import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});


export const metadata: Metadata = {
  title: "Fence Trading - Fellesskap, verktøy og signaler",
  description: "Fence Trading er et trading-fellesskap for læring, signalsporing, broker-onboarding og praktiske verktøy.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
