import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusBite · SRM canteen",
  description: "Order canteen food in plain English with an AI agent",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
