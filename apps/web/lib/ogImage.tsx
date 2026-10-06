import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Link-preview picture of one record (shown by chat apps and search results): its name, its dates
// and what kind of record it is. Fonts are read from the self-hosted @fontsource files, because the
// renderer needs the font data itself and the Vietnamese letters must be in it.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// The web app runs with its own folder as the working directory (`next dev`, `next start`, the
// Docker image), and @fontsource is one of its direct dependencies, so the files are found there.
const fontFile = (pkg: string, file: string) =>
  readFile(join(process.cwd(), "node_modules", pkg, "files", file));

// Loaded once per server process; a glyph missing from one subset is taken from the next.
let fonts: ReturnType<typeof loadFonts> | undefined;
function loadFonts() {
  return Promise.all([
    ...["latin", "latin-ext", "vietnamese"].map(async (subset) => ({
      name: "Newsreader",
      weight: 600 as const,
      style: "normal" as const,
      data: await fontFile("@fontsource/newsreader", `newsreader-${subset}-600-normal.woff`),
    })),
    ...["latin", "latin-ext", "vietnamese"].map(async (subset) => ({
      name: "Be Vietnam Pro",
      weight: 400 as const,
      style: "normal" as const,
      data: await fontFile(
        "@fontsource/be-vietnam-pro",
        `be-vietnam-pro-${subset}-400-normal.woff`,
      ),
    })),
  ]);
}

type Options = {
  title: string;
  /** Kind of record: "Nhân vật", "Chính thể", "Sự kiện". */
  kind: string;
  /** A line under the title, usually the dates. */
  subtitle?: string;
};

export async function renderOgImage({ title, kind, subtitle }: Options) {
  fonts ??= loadFonts();
  // Long names get a smaller size so they stay on three lines at most.
  const titleSize = title.length > 60 ? 64 : title.length > 32 ? 80 : 96;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#f6f0e3",
        borderLeft: "24px solid #9c2a1c",
        padding: "64px 72px",
        fontFamily: "Be Vietnam Pro",
      }}
    >
      <div style={{ display: "flex", fontSize: 30, color: "#9c2a1c", letterSpacing: 2 }}>
        {kind.toUpperCase()}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Newsreader",
            fontWeight: 600,
            fontSize: titleSize,
            lineHeight: 1.1,
            color: "#2b1d16",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ display: "flex", fontSize: 38, color: "#5d4b40", marginTop: 24 }}>
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", fontSize: 32, color: "#b0802a" }}>
        <span style={{ fontFamily: "Newsreader", fontWeight: 600 }}>Sử Phả</span>
        <span style={{ marginLeft: 20, color: "#5d4b40", fontSize: 26 }}>
          Lịch sử thế giới qua từng dòng phả hệ
        </span>
      </div>
    </div>,
    { ...OG_SIZE, fonts: await fonts },
  );
}
