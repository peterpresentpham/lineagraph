import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const API_URL = process.env.API_URL ?? "http://localhost:4200";
const PAGE_SIZE = 200; // server caps `limit` at 200 regardless of what we ask for
const MAX_PERSONS = 20_000; // safety bound on the pagination loop below

async function allPersonSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  for (let offset = 0; offset < MAX_PERSONS; offset += PAGE_SIZE) {
    const res = await fetch(`${API_URL}/persons?limit=${PAGE_SIZE}&offset=${offset}`, {
      cache: "no-store",
    });
    if (!res.ok) break;
    const { items, total } = (await res.json()) as { items: { slug: string }[]; total: number };
    slugs.push(...items.map((p) => p.slug));
    if (offset + PAGE_SIZE >= total) break;
  }
  return slugs;
}

async function allPolitySlugs(): Promise<string[]> {
  const res = await fetch(`${API_URL}/polities`, { cache: "no-store" });
  if (!res.ok) return [];
  const polities = (await res.json()) as { slug: string }[];
  return polities.map((p) => p.slug);
}

const staticRoutes: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/persons", priority: 0.7, changeFrequency: "weekly" },
  { path: "/polities", priority: 0.7, changeFrequency: "weekly" },
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
    const [personSlugs, politySlugs] = await Promise.all([allPersonSlugs(), allPolitySlugs()]);
    for (const slug of personSlugs) {
      entries.push({
        url: `${SITE_URL}/person/${slug}`,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
    for (const slug of politySlugs) {
      entries.push({
        url: `${SITE_URL}/polity/${slug}`,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {
    // API unreachable: ship the static routes rather than failing the whole sitemap.
  }

  return entries;
}
