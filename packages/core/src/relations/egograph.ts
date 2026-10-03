export type EgoLink = { a: string; b: string; rank: number };

export type EgoOptions = {
  rootIds: string[];
  /** Nodes the caller already has; never returned again, never walked through. */
  known?: ReadonlySet<string>;
  depth: number;
  /** Maximum number of NEW nodes to return. */
  limit: number;
  fetchLinks: (ids: string[]) => Promise<EgoLink[]>;
};

export type EgoResult = { added: string[]; truncated: boolean };

export async function egoBfs({
  rootIds,
  known = new Set(),
  depth,
  limit,
  fetchLinks,
}: EgoOptions): Promise<EgoResult> {
  const seen = new Set<string>([...known, ...rootIds]);
  const added: string[] = [];
  let frontier = [...rootIds];
  let truncated = false;

  for (let layer = 0; layer < depth && frontier.length > 0; layer++) {
    const links = await fetchLinks(frontier);
    const inFrontier = new Set(frontier);
    // Best (lowest) rank at which each unseen node is reached, in discovery order.
    const candidates = new Map<string, number>();
    for (const l of links) {
      for (const [from, to] of [
        [l.a, l.b],
        [l.b, l.a],
      ] as const) {
        if (!inFrontier.has(from) || seen.has(to)) continue;
        const best = candidates.get(to);
        if (best === undefined || l.rank < best) candidates.set(to, l.rank);
      }
    }
    const ordered = [...candidates.entries()].sort((x, y) => x[1] - y[1]).map(([id]) => id);
    const room = limit - added.length;
    const taken = ordered.slice(0, Math.max(room, 0));
    if (ordered.length > taken.length) truncated = true;
    for (const id of taken) {
      seen.add(id);
      added.push(id);
    }
    if (truncated) break;
    frontier = taken;
  }
  return { added, truncated };
}

/** For each node in `ids`, how many distinct neighbours lie outside `ids`. */
export function countHidden(ids: ReadonlySet<string>, links: EgoLink[]): Map<string, number> {
  const outside = new Map<string, Set<string>>();
  for (const l of links) {
    for (const [from, to] of [
      [l.a, l.b],
      [l.b, l.a],
    ] as const) {
      if (!ids.has(from) || ids.has(to)) continue;
      const set = outside.get(from) ?? new Set<string>();
      set.add(to);
      outside.set(from, set);
    }
  }
  return new Map([...outside].map(([id, set]) => [id, set.size]));
}
