import type { MetadataRoute } from "next";
import { API_URL, SITE_URL } from "@/lib/site";

const PAGE_SIZE = 200; // server caps `limit` at 200 regardless of what we ask for
const MAX_ITEMS = 20_000; // safety bound on the pagination loop below

// Every slug of one listing endpoint (persons, polities, events), page by page.
async function allSlugs(path: string): Promise<string[]> {
  const slugs: string[] = [];
  for (let offset = 0; offset < MAX_ITEMS; offset += PAGE_SIZE) {
    const res = await fetch(`${API_URL}${path}?limit=${PAGE_SIZE}&offset=${offset}`, {
      cache: "no-store",
    });
    if (!res.ok) break;
    const { items, total } = (await res.json()) as { items: { slug: string }[]; total: number };
    slugs.push(...items.map((p) => p.slug));
    if (offset + PAGE_SIZE >= total) break;
  }
  return slugs;
}

const staticRoutes: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/persons", priority: 0.7, changeFrequency: "weekly" },
  { path: "/polities", priority: 0.7, changeFrequency: "weekly" },
  { path: "/events", priority: 0.7, changeFrequency: "weekly" },
  { path: "/timeline", priority: 0.7, changeFrequency: "weekly" },
  { path: "/search", priority: 0.4, changeFrequency: "monthly" },
  { path: "/relations", priority: 0.4, changeFrequency: "monthly" },
  { path: "/graph", priority: 0.4, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = staticRoutes.map(
    ({ path, priority, changeFrequency }) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency,
      priority,
    }),
  );

  try {
    const [personSlugs, politySlugs, eventSlugs] = await Promise.all([
      allSlugs("/persons"),
      allSlugs("/polities"),
      allSlugs("/events"),
    ]);
    for (const [prefix, slugs] of [
      ["person", personSlugs],
      ["polity", politySlugs],
      ["event", eventSlugs],
    ] as const) {
      for (const slug of slugs) {
        entries.push({
          url: `${SITE_URL}/${prefix}/${slug}`,
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }
    }
  } catch {
    // API unreachable: ship the static routes rather than failing the whole sitemap.
  }

  return entries;
}
