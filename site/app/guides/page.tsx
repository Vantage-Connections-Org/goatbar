import type { Metadata } from "next";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { GUIDES } from "@/content/guides";

export const metadata: Metadata = {
  title: "Guides for Claude Code and Codex power users | GoatBar",
  description: "Practical guides for running several Claude Code and Codex CLI sessions at once on Windows: tracking them, naming them, and knowing when each one is done.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndex() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-semibold tracking-tighter md:text-5xl">Guides</h1>
        <p className="mt-4 max-w-[60ch] text-lg text-muted">Practical notes on running several AI coding agents at once.</p>
        <div className="mt-10 grid gap-3">
          {GUIDES.map((g) => (
            <a key={g.slug} href={`/guides/${g.slug}`} className="group rounded-2xl border border-line bg-surface p-6 transition hover:border-muted">
              <h2 className="flex items-center justify-between gap-4 text-lg font-semibold">
                {g.title}
                <ArrowRight size={18} className="shrink-0 text-muted transition group-hover:translate-x-0.5" />
              </h2>
              <p className="mt-2 text-muted">{g.description}</p>
            </a>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
