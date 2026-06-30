import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { RecommendationProvider } from "@/lib/recommendation-context";
import { EntityLocaleProvider } from "@/lib/entity-locale";
import { TooltipProvider } from "@/components/ui/tooltip";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["500", "600", "700"],
  display: "swap",
});

const SITE_URL = "https://tbh-companion-web.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TBH Companion — Task Bar Hero optimizer, rune tree & gear compare",
    template: "%s · TBH Companion",
  },
  description:
    "Free client-side companion for TBH: Task Bar Hero. Farm optimizer, 197-node rune tree, gear comparator and a save reader — your save never leaves your browser. No login, no server.",
  applicationName: "TBH Companion",
  keywords: [
    "Task Bar Hero",
    "TBH",
    "taskbar hero optimizer",
    "tbh farming calculator",
    "task bar hero rune tree",
    "tbh gear compare",
    "tbh save analyzer",
    "idle rpg",
    "steam game companion",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "TBH Companion",
    title: "TBH Companion — Task Bar Hero optimizer, rune tree & gear compare",
    description:
      "Farm optimizer, 197-node rune tree, gear comparator & save reader for TBH: Task Bar Hero. 100% client-side — your save never leaves your browser.",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "TBH Companion — Task Bar Hero optimizer",
    description:
      "Farm optimizer, rune tree, gear comparator & save reader for TBH: Task Bar Hero. Client-side, free, no login.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <EntityLocaleProvider>
            <RecommendationProvider>{children}</RecommendationProvider>
          </EntityLocaleProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
