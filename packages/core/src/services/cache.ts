// In-process cache for small, rarely-changing reference data (relation types, registry labels,
// ...). Every DB round trip here costs a fixed network tax regardless of row count, so caching
// data that is the same for every request removes that tax entirely instead of just shrinking
// a query that was already sub-millisecond server-side.

const store = new Map<string, { value: unknown; expires: number }>();

/** Cache key of the relation type table (read by relationships.ts, written by relationTypes.ts). */
export const TYPES_CACHE_KEY = "relation-types";

/** Cache key of the whole relationship graph (relations, tenures, people) used by path search. */
export const GRAPH_CACHE_KEY = "graph-data";

/** Call after any write that can change the graph; the next path search reloads it. */
export function invalidateGraphCache() {
  invalidate(GRAPH_CACHE_KEY);
}

/** Drops cached entries so the next read reloads them; call after writing the data they hold. */
export function invalidate(...keys: string[]) {
  for (const key of keys) store.delete(key);
}

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await load();
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}
