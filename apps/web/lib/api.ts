import { cache } from "react";
import { notFound } from "next/navigation";
import { API_URL } from "./site";
import type { RegistryItem } from "./types";

// Pages share one fetch per path within a request (React `cache`), so a page and its
// generateMetadata no longer call the API twice. Data is reused for a minute across requests.
const REVALIDATE_SECONDS = 60;

const fetchJson = cache(async (path: string, fresh: boolean): Promise<unknown> => {
  const response = await fetch(
    `${API_URL}${path}`,
    fresh ? { cache: "no-store" } : { next: { revalidate: REVALIDATE_SECONDS } },
  );
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error(`API ${path} failed with ${response.status}`);
  return response.json();
});

// Public read-only API; the web app never sends credentials. `fresh` skips the one-minute
// reuse, for results that depend on what the visitor just typed.
export function apiGet<T>(path: string, options?: { fresh?: boolean }): Promise<T> {
  return fetchJson(path, options?.fresh ?? false) as Promise<T>;
}

export async function getLabels(table: string): Promise<Record<string, string>> {
  const items = await apiGet<RegistryItem[]>(`/registries/${table}`);
  return Object.fromEntries(items.map((i) => [i.code, i.label]));
}
