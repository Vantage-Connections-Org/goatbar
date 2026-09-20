import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { GUIDES } from "@/content/guides";
import { SITE_URL } from "@/lib/site";
import { DownloadButton } from "@/components/DownloadButton";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) return {};
  return {
    title: `${g.title} | GoatBar`,
    description: g.description,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: { type: "article", title: g.title, description: g.description, url: `/guides/${g.slug}` },
  };
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: g.title,
    description: g.description,
    dateModified: g.updated,
    url: `${SITE_URL}/guides/${g.slug}`,
    publisher: { "@type": "Organization", name: "Vantage Connections" },
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <a href="/guides" className="text-sm text-muted hover:text-text">Guides</a>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tighter md:text-5xl">{g.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">{g.description}</p>
        <p className="mt-2 text-sm text-muted">Updated {g.updated}</p>

        <article className="mt-12 grid gap-10">
          {g.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-2xl font-semibold tracking-tight">{s.heading}</h2>
              {s.paragraphs.map((p, i) => (
                <p key={i} className="mt-3 max-w-[68ch] leading-relaxed text-muted">{p}</p>
              ))}
              {s.code && (
                <pre className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface-2 p-4 font-mono text-sm leading-relaxed">{s.code}</pre>
              )}
            </section>
          ))}
        </article>

        <aside className="mt-16 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[44ch] text-muted">GoatBar shows every Claude Code and Codex chat in your Windows taskbar. Free and open source.</p>
          <DownloadButton className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-5 py-3 font-medium text-accent-ink transition hover:brightness-110 active:scale-[0.98]" />
        </aside>
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
