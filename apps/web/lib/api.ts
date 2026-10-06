import { cache } from "react";
import { notFound } from "next/navigation";
import { API_URL } from "./site";
import type { RegistryItem } from "./types";

// Pages share one fetch per path within a request (React `cache`), so a page and its
// generateMetadata no longer call the API twice. Data is reused for a minute across requests.
const REVALIDATE_SECONDS = 60;
// A hung API must not hold a page render (and the visitor) for longer than this.
const TIMEOUT_MS = 5000;

// The last good answer per path. When the API is down or slow, a page is served from this instead
// of an error screen: a stale list of dynasties is far better for a visitor than none. Lives in the
// server process, so it is lost on restart, and is capped so it cannot grow without bound.
const lastGood = new Map<string, unknown>();
const MAX_REMEMBERED = 500;

function remember(path: string, data: unknown) {
  lastGood.delete(path);
  lastGood.set(path, data);
  if (lastGood.size > MAX_REMEMBERED) lastGood.delete(lastGood.keys().next().value!);
}

const fetchJson = cache(async (path: string, fresh: boolean): Promise<unknown> => {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: REVALIDATE_SECONDS } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (lastGood.has(path)) return lastGood.get(path);
    throw err;
  }
  // A missing record is a real answer, not an outage: never replaced by stale data.
  if (response.status === 404) notFound();
  if (!response.ok) {
    if (lastGood.has(path)) return lastGood.get(path);
    throw new Error(`API ${path} failed with ${response.status}`);
  }
  const data = await response.json();
  remember(path, data);
  return data;
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
