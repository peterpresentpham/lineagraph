// In-process cache for small, rarely-changing reference data (relation types, registry labels,
// ...). Every DB round trip here costs a fixed network tax regardless of row count, so caching
// data that is the same for every request removes that tax entirely instead of just shrinking
// a query that was already sub-millisecond server-side.

const store = new Map<string, { value: unknown; expires: number }>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await load();
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}
