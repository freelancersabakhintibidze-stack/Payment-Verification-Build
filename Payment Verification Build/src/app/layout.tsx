import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import AnnouncementStrip from "@/components/site/AnnouncementStrip";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import "./globals.css";

const fraunces = localFont({
  src: [
    {
      path: "../fonts/fraunces-variable.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../fonts/fraunces-variable-italic.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-fraunces",
  display: "swap",
});

const plexMono = localFont({
  src: [
    { path: "../fonts/plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/plex-mono-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/plex-mono-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Aether Arena · Solana Payment Verification",
    template: "%s · Aether Arena",
  },
  description:
    "On-chain payment verification, automatic delivery triggers, and a merchant dashboard for Solana. Poll the chain, match the memo, ship the proof.",
  openGraph: {
    title: "Aether Arena · Solana Payment Verification",
    description:
      "Real-time on-chain payment verification, auto-delivery, and a merchant dashboard. Built on Next.js 16, Prisma, and Solana web3.js.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0c0b" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${plexMono.variable}`}
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-accent focus:px-4 focus:py-2 focus:font-mono focus:text-[0.7rem] focus:uppercase focus:tracking-[0.12em] focus:text-white"
          >
            Skip to content
          </a>
          <AnnouncementStrip />
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
