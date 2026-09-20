import Image from "next/image";
import { GithubLogo, Star } from "@phosphor-icons/react/dist/ssr";
import { REPO_URL, githubStars } from "@/lib/site";

/** Top navigation shared by every page. */
export async function SiteHeader() {
  const stars = await githubStars();
  return (
      <header className="sticky top-0 z-20 border-b border-line/70 bg-bg/80 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <Image src="/goat-head.png" alt="" width={30} height={30} priority />
            GoatBar
          </a>
          <div className="flex items-center gap-1 text-sm sm:gap-2">
            <a href="/#how" className="hidden rounded-lg px-3 py-2 text-muted transition hover:text-text sm:block">How it works</a>
            <a href="/#install" className="hidden rounded-lg px-3 py-2 text-muted transition hover:text-text sm:block">Install</a>
            <a href="/#faq" className="hidden rounded-lg px-3 py-2 text-muted transition hover:text-text md:block">FAQ</a>
            <a href="/guides" className="hidden rounded-lg px-3 py-2 text-muted transition hover:text-text md:block">Guides</a>
            <a
              href={REPO_URL}
              className="ml-1 inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 font-medium transition hover:border-muted active:scale-[0.98]"
            >
              <GithubLogo size={18} weight="fill" />
              <span className="hidden sm:inline">GitHub</span>
              {stars !== null && (
                <span className="inline-flex items-center gap-1 text-muted">
                  <Star size={14} weight="fill" />
                  {stars}
                </span>
              )}
            </a>
          </div>
        </nav>
      </header>
  );
}

/** Footer shared by every page. */
export function SiteFooter() {
  return (
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="flex items-center gap-2">
            <Image src="/goat-head.png" alt="" width={22} height={22} />
            GoatBar is free and MIT licensed. Not affiliated with Anthropic or OpenAI.
          </p>
          <div className="flex gap-5">
            <a href={REPO_URL} className="hover:text-text">GitHub</a>
            <a href={`${REPO_URL}/issues`} className="hover:text-text">Report an issue</a>
            <a href="/guides" className="hover:text-text">Guides</a>
            <a href="/#mac" className="hover:text-text">Mac waitlist</a>
          </div>
        </div>
      </footer>
  );
}
