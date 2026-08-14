import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fence Trading - Signaler, verifisering og copy trading",
  description:
    "Fence Trading samler broker-onboarding, Discord, Telegram, signalhistorikk og tradingverktøy i en moderne affiliate-flyt.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <body>{children}</body>
    </html>
  );
}
