import type { MetadataRoute } from "next";
import { API_URL, SITE_URL } from "@/lib/site";

const PAGE_SIZE = 200; // the API caps `limit` at 200 regardless of what is asked for
// A sitemap file may hold 50 000 URLs. The three kinds share that, so each stops at this many;
// past it the sitemap needs splitting with generateSitemaps.
const MAX_PER_KIND = 15_000;
const REVALIDATE_SECONDS = 3600;

type Listed = { slug: string; updatedAt?: string };

// Every record of one listing endpoint (persons, polities, events), page by page.
async function allRecords(path: string): Promise<Listed[]> {
  const records: Listed[] = [];
  for (let offset = 0; offset < MAX_PER_KIND; offset += PAGE_SIZE) {
    const res = await fetch(`${API_URL}${path}?limit=${PAGE_SIZE}&offset=${offset}`, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) break;
    const { items, total } = (await res.json()) as { items: Listed[]; total: number };
    records.push(...items);
    if (offset + PAGE_SIZE >= total) break;
  }
  return records;
}

// Pages worth indexing. Search results, the relation finder and the graph are left out: they
// depend on what the visitor types and are marked noindex.
const staticRoutes: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/persons", priority: 0.7, changeFrequency: "weekly" },
  { path: "/polities", priority: 0.7, changeFrequency: "weekly" },
  { path: "/events", priority: 0.7, changeFrequency: "weekly" },
  { path: "/timeline", priority: 0.7, changeFrequency: "weekly" },
  { path: "/thu-thach", priority: 0.6, changeFrequency: "weekly" },
  { path: "/hom-nay", priority: 0.6, changeFrequency: "weekly" },
  { path: "/gioi-thieu", priority: 0.5, changeFrequency: "monthly" },
  { path: "/nguon", priority: 0.5, changeFrequency: "weekly" },
  { path: "/bao-loi", priority: 0.3, changeFrequency: "monthly" },
  { path: "/quyen-rieng-tu", priority: 0.2, changeFrequency: "monthly" },
  { path: "/dieu-khoan", priority: 0.2, changeFrequency: "monthly" },
];

// Built per request (the API is not running while the site is built); the API answers are cached for
// an hour, so a crawler does not trigger the full walk each time.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = staticRoutes.map(
    ({ path, priority, changeFrequency }) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency,
      priority,
    }),
  );

  try {
    const kinds = [
      ["person", "/persons"],
      ["polity", "/polities"],
      ["event", "/events"],
    ] as const;
    const lists = await Promise.all(kinds.map(([, path]) => allRecords(path)));
    kinds.forEach(([prefix], i) => {
      for (const r of lists[i]!) {
        entries.push({
          url: `${SITE_URL}/${prefix}/${r.slug}`,
          lastModified: r.updatedAt,
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }
    });
  } catch {
    // API unreachable: ship the static routes rather than failing the whole sitemap.
  }

  return entries;
}
