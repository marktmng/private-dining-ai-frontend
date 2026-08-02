import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Private Dining AI",
  description: "AI Powered Restaurant Ordering",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}