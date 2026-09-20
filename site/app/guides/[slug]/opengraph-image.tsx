import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { GUIDES } from "@/content/guides";

// Per-guide share image: the guide's own title with the GoatBar goat.
export const alt = "GoatBar guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  const goat = await readFile(join(process.cwd(), "public", "goat.png"));
  const geistBold = await readFile(join(process.cwd(), "assets", "fonts", "Geist-Bold.ttf")); // SIL OFL, see Geist-OFL.txt
  const goatSrc = `data:image/png;base64,${goat.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0e0f11", padding: 72, alignItems: "center", fontFamily: "Geist" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 40 }}>
          <div style={{ fontSize: 34, color: "#4ade80", fontWeight: 700 }}>GoatBar guide</div>
          <div style={{ fontSize: 64, color: "#eceef0", fontWeight: 700, lineHeight: 1.1, marginTop: 24 }}>
            {guide?.title ?? "Guides"}
          </div>
          <div style={{ fontSize: 28, color: "#9aa1a8", marginTop: 28 }}>goatbar.melbora.com</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={goatSrc} width={340} height={340} alt="" />
      </div>
    ),
    { ...size, fonts: [{ name: "Geist", data: geistBold, weight: 700, style: "normal" }] },
  );
}
