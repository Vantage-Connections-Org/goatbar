import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { DESCRIPTION, DOWNLOAD_URL, REPO_URL, SITE_URL, TITLE } from "@/lib/site";
import { FAQ } from "@/lib/faq";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "GoatBar",
  keywords: [
    "Claude Code", "Codex", "OpenAI Codex CLI", "AI coding agents", "Windows taskbar",
    "agent status", "multiple Claude Code sessions", "developer tools", "open source",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "GoatBar",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0f11" },
  ],
};

// Structured data: what the app is, and the FAQ. No ratings or counts: we only state facts.
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "GoatBar",
    description: DESCRIPTION,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Windows 10, Windows 11",
    url: SITE_URL,
    downloadUrl: DOWNLOAD_URL,
    softwareHelp: `${REPO_URL}#readme`,
    license: "https://opensource.org/licenses/MIT",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    codeRepository: REPO_URL,
    image: `${SITE_URL}/goat.png`,
    screenshot: `${SITE_URL}/taskbar.png`,
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-[100dvh] font-sans">
        {children}
        <Analytics />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
