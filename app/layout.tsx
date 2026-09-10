import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MSU Future Learning",
  description: "Presence-aware online learning system"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
