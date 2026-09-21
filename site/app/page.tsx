import Image from "next/image";
import { AppleLogo, ArrowRight, DownloadSimple, CursorClick, GithubLogo, HardDrives, Plugs } from "@phosphor-icons/react/dist/ssr";
import { CopyButton } from "@/components/CopyButton";
import { DownloadButton } from "@/components/DownloadButton";
import { Reveal } from "@/components/Reveal";
import { WaitlistForm } from "@/components/WaitlistForm";
import { FAQ } from "@/lib/faq";
import { GUIDES } from "@/content/guides";
import { DOWNLOAD_URL, MAC_DOWNLOAD_URL, REPO_URL } from "@/lib/site";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

const INSTALL = `git clone ${REPO_URL}
cd goatbar
.\\install.ps1 -StartWithWindows`;

// The four states, drawn with the same colours the app uses.
const STATES = [
  { name: "Working", note: "Busy. No need to look.", bg: "#4A3514", border: "#FF7A1A" },
  { name: "Done", note: "Finished and waiting on you.", bg: "#38845C", border: "#3B82FF" },
  { name: "Needs an answer", note: "A question or permission prompt.", bg: "#1C4270", border: "#B455FF" },
  { name: "Idle", note: "Shrinks to a thin bar.", bg: "#262626", border: "#F06BB8", idle: true },
];

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* Hero */}
        {/* No fade-in here: the hero is the LCP element and must paint on first render. */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tighter md:text-5xl lg:text-6xl">
              Every agent chat, one glance at your taskbar.
            </h1>
            <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted">
              GoatBar shows each running Claude Code and Codex chat as a square in your Windows taskbar. Click one to jump to it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <DownloadButton className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-medium text-accent-ink transition hover:brightness-110 active:scale-[0.98]" />
              <a
                href={REPO_URL}
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-3 font-medium transition hover:border-muted active:scale-[0.98]"
              >
                <GithubLogo size={20} weight="fill" />
                View source
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-line bg-[#18181a] p-3 shadow-[0_24px_60px_-24px_rgb(22_24_26/0.45)]">
              <Image
                src="/hover-card.png"
                alt="GoatBar in the Windows taskbar: chat squares left of the system tray, with a hover card showing a chat's name, folder, status and current step"
                width={1140}
                height={410}
                priority
                className="h-auto w-full rounded-lg"
              />
            </div>
          </div>
        </section>

        {/* States */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <Reveal>
              <h2 className="max-w-[24ch] text-3xl font-semibold tracking-tight md:text-4xl">The background tells you what each agent is doing.</h2>
              <p className="mt-3 max-w-[60ch] text-muted">The border is the chat&apos;s own colour, so you can tell them apart. Hover any square for details.</p>
            </Reveal>
            <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
              {STATES.map((s, i) => (
                <Reveal key={s.name} delay={i * 0.06}>
                  <div className="flex h-16 items-end">
                    <div
                      aria-hidden
                      className="rounded-[9px]"
                      style={{
                        width: s.idle ? 44 : 56,
                        height: s.idle ? 10 : 56,
                        background: s.idle ? s.border : s.bg,
                        opacity: s.idle ? 0.6 : 1,
                        border: s.idle ? "none" : `3px solid ${s.border}`,
                      }}
                    />
                  </div>
                  <h3 className="mt-4 font-semibold">{s.name}</h3>
                  <p className="mt-1 text-sm text-muted">{s.note}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works: bento */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <Reveal>
            <h2 className="max-w-[20ch] text-3xl font-semibold tracking-tight md:text-4xl">Built for running several agents at once.</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-5">
            <Reveal className="md:col-span-3">
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface">
                <div className="p-6">
                  <h3 className="text-lg font-semibold">Lives in the taskbar, not another window</h3>
                  <p className="mt-2 max-w-[48ch] text-muted">The squares sit next to the system tray, always visible, even when your editor is hidden.</p>
                </div>
                <div className="mt-auto bg-[#1c1c1c] px-4 pb-4 pt-6">
                  <Image
                    src="/taskbar.png"
                    alt="The Windows 11 taskbar with GoatBar squares next to the system tray"
                    width={804}
                    height={157}
                    className="h-auto w-full"
                  />
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.08} className="md:col-span-2">
              <div className="flex h-full flex-col rounded-2xl border border-line bg-accent-soft p-6">
                <HardDrives size={28} className="text-accent" />
                <h3 className="mt-4 text-lg font-semibold">Local files only. No keys, no network.</h3>
                <p className="mt-2 text-muted">GoatBar reads the session files Claude Code and Codex already keep on your machine, and never changes them.</p>
                <code className="mt-5 block rounded-lg bg-surface px-3 py-2 font-mono text-sm leading-relaxed">
                  ~/.claude/sessions
                  <br />
                  ~/.codex/sessions
                </code>
              </div>
            </Reveal>
            <Reveal delay={0.04} className="md:col-span-2">
              <div className="flex h-full flex-col rounded-2xl border border-line bg-surface p-6">
                <CursorClick size={28} className="text-accent" />
                <h3 className="mt-4 text-lg font-semibold">Click a square, land in that chat&apos;s window</h3>
                <p className="mt-2 text-muted">Works with Zed, Windows Terminal, VS Code, Cursor and more. Drag squares to reorder them.</p>
                {/* Real screen recording of dragging a square (same clip as docs/demo-drag.gif, as a ~30KB video) */}
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="none"
                  width={1000}
                  height={120}
                  aria-label="Dragging a chat square along the GoatBar row: it lights up while held and drops into a new position"
                  className="mt-auto h-auto w-full rounded-lg pt-5"
                >
                  <source src="/demo-drag.webm" type="video/webm" />
                  <source src="/demo-drag.mp4" type="video/mp4" />
                </video>
              </div>
            </Reveal>
            <Reveal delay={0.1} className="md:col-span-3">
              <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-line bg-surface p-6 sm:flex-row sm:items-center">
                <div>
                  <Plugs size={28} className="text-accent" />
                  <h3 className="mt-4 text-lg font-semibold">Claude Code and Codex, found automatically</h3>
                  <p className="mt-2 max-w-[44ch] text-muted">No setup. An optional hook adds the step each agent is on and a blue &quot;needs an answer&quot; state.</p>
                </div>
                <Image src="/goat.png" alt="The GoatBar goat mascot peeking over a taskbar" width={140} height={140} className="shrink-0 self-center" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Install */}
        <section id="install" className="scroll-mt-20 bg-[#101113] text-zinc-100">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Download, unzip, run.</h2>
              <p className="mt-3 max-w-[48ch] text-zinc-400">
                One zip for Windows 10 and 11. No installer and nothing else to install. Your chats show up in the taskbar right away.
              </p>
              <a
                href={DOWNLOAD_URL}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#4ade80] px-5 py-3 font-medium text-[#0b2415] transition hover:brightness-110 active:scale-[0.98]"
              >
                <DownloadSimple size={20} weight="bold" />
                Download GoatBar.zip
              </a>
              <p className="mt-4 max-w-[52ch] text-sm text-zinc-400">
                The app isn&apos;t code-signed yet, so Windows SmartScreen may ask first: choose More info, then Run anyway. Right-click the tray goat for Start with Windows.
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#18191c]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                  <span className="text-xs text-zinc-400">Or build from source (needs the .NET 8 SDK)</span>
                  <CopyButton text={INSTALL} />
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-zinc-200">{INSTALL}</pre>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Mac waitlist */}
        <section id="mac" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <div className="grid items-center gap-10 rounded-3xl border border-line bg-surface p-8 md:grid-cols-[auto_1fr] md:p-12">
            <Image src="/goat-head.png" alt="" width={120} height={120} className="hidden md:block" />
            <Reveal>
              <h2 className="flex items-center gap-3 text-3xl font-semibold tracking-tight md:text-4xl">
                <AppleLogo size={34} weight="fill" className="shrink-0" />
                On a Mac? Try the preview.
              </h2>
              <p className="mb-6 mt-3 max-w-[52ch] text-muted">
                The macOS menu bar version is an early preview: it works the same way, but has had far less
                testing than the Windows app. Try it and tell us what breaks.
              </p>
              <a
                href={MAC_DOWNLOAD_URL}
                className="mb-6 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-medium text-accent-ink transition hover:brightness-110 active:scale-[0.98]"
              >
                <AppleLogo size={20} weight="fill" />
                Download for Mac (preview)
              </a>
              <ol className="mb-8 grid gap-2 text-sm text-muted">
                <li>1. Open the disk image and drag GoatBar to Applications.</li>
                <li>
                  2. First launch is blocked because the app is not notarized yet. Open System Settings, go to
                  Privacy &amp; Security, scroll to Security and click <span className="font-medium text-text">Open Anyway</span>.
                </li>
                <li>3. The squares appear in your menu bar. Click one to jump to that chat.</li>
              </ol>
              <p className="mb-4 max-w-[52ch] text-muted">Want an email when the stable version ships?</p>
              <WaitlistForm />
            </Reveal>
          </div>
        </section>

        {/* Guides: internal links into the how-to pages */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Guides for running several agents</h2>
          <div className="mt-8 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin] snap-x">
            {GUIDES.map((g) => (
              <a
                key={g.slug}
                href={`/guides/${g.slug}`}
                className="group flex w-72 shrink-0 snap-start flex-col justify-between gap-6 rounded-2xl border border-line bg-surface p-5 transition hover:border-muted"
              >
                <span className="font-semibold leading-snug">{g.title}</span>
                <span className="inline-flex items-center gap-1.5 text-sm text-accent">
                  Read the guide <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-24 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Questions</h2>
          <div className="mt-8 grid gap-3">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group rounded-2xl border border-line bg-surface px-5 py-4 open:pb-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <ArrowRight size={16} className="shrink-0 text-muted transition group-open:rotate-90" />
                </summary>
                <p className="mt-3 leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
