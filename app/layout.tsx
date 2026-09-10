import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fulseta — Verified work. Automatic payment.",
  description: "Outcome-based escrow powered by GenLayer validator consensus."
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
