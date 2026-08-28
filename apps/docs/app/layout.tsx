import type { Metadata } from "next";
import localFont from "next/font/local";
import { Shell } from "./_components/shell";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  display: "swap",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  // `%s` is filled from each page's own title, keeping page titles specific
  // and unique, which is what WCAG 2.4.2 asks for.
  title: {
    default: "retro-mcps docs — WCAG 2 basics and accessibility tooling",
    template: "%s — retro-mcps docs",
  },
  description:
    "Plain-language documentation for WCAG 2 colour contrast, screen reader support, and keyboard navigation, plus the wcag-a11y-scanner MCP server.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // A declared language lets screen readers pick the right pronunciation
    // rules (WCAG 3.1.1).
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
