// Facts used across the site. Everything here is true today; keep it that way.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://goatbar.melbora.com";
export const REPO = "Vantage-Connections-Org/goatbar";
export const REPO_URL = `https://github.com/${REPO}`;
// Always the newest release's Windows zip (self-contained, no .NET install needed).
export const DOWNLOAD_URL = `${REPO_URL}/releases/latest/download/GoatBar-windows-x64.zip`;
export const MAC_DOWNLOAD_URL = `${REPO_URL}/releases/latest/download/GoatBar-mac-preview.dmg`;

export const TITLE = "GoatBar: see every Claude Code and Codex chat in your taskbar";
export const DESCRIPTION =
  "Free, open-source Windows app that shows every running Claude Code and Codex chat as a status square in your taskbar. Working, done, or waiting on you, at a glance.";

/** Live star count from the GitHub API (cached for an hour). Null if the API is unreachable. */
export async function githubStars(): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: number };
    return typeof data.stargazers_count === "number" ? data.stargazers_count : null;
  } catch {
    return null;
  }
}
