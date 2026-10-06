export type RelationTypeInfo = { code: string; inverse: string | null; symmetric: boolean };

export type RelationEdge = {
  id: string;
  type: string;
  fromId: string;
  toId: string;
  variant: string | null;
  label: string | null;
  disputed: boolean;
  /** 1 (minor) to 5 (core); only graph views use it. */
  importance?: number;
};

export type TenureEdge = { id: string; personId: string; polityId: string; officeType: string };

export type Step = {
  edgeId: string;
  fromId: string;
  toId: string;
  /** Type as seen when walking from `fromId` to `toId` (the inverse type when `reversed`). */
  type: string;
  variant: string | null;
  label: string | null;
  disputed: boolean;
  reversed: boolean;
  source: "relation" | "tenure";
  cost: number;
};

export type Path = { steps: Step[]; cost: number };

export type PathOptions = {
  /** Highest total cost to explore. A relation costs 1, a tenure 2. */
  maxCost?: number;
  limit?: number;
  includeDisputed?: boolean;
};

export const TENURE_TYPE = "tenure";
const TENURE_COST = 2;

export function buildAdjacency(
  relations: RelationEdge[],
  tenures: TenureEdge[],
  types: Map<string, RelationTypeInfo>,
): Map<string, Step[]> {
  const adjacency = new Map<string, Step[]>();
  const add = (step: Step) => {
    const list = adjacency.get(step.fromId);
    if (list) list.push(step);
    else adjacency.set(step.fromId, [step]);
  };

  for (const r of relations) {
    const info = types.get(r.type);
    const base = {
      edgeId: r.id,
      variant: r.variant,
      label: r.label,
      disputed: r.disputed,
      source: "relation" as const,
      cost: 1,
    };
    add({ ...base, fromId: r.fromId, toId: r.toId, type: r.type, reversed: false });
    const reverseType = info?.symmetric ? r.type : (info?.inverse ?? r.type);
    add({ ...base, fromId: r.toId, toId: r.fromId, type: reverseType, reversed: !info?.symmetric });
  }
  for (const t of tenures) {
    const base = {
      edgeId: t.id,
      variant: t.officeType,
      label: null,
      disputed: false,
      source: "tenure" as const,
      cost: TENURE_COST,
      type: TENURE_TYPE,
    };
    add({ ...base, fromId: t.personId, toId: t.polityId, reversed: false });
    add({ ...base, fromId: t.polityId, toId: t.personId, reversed: true });
  }
  return adjacency;
}

const MAX_VISITS = 100_000;

/** Cheapest cost from every node to `targetId` (only nodes within `maxCost`), by bucketed Dijkstra. */
function costsTo(
  adjacency: Map<string, Step[]>,
  targetId: string,
  maxCost: number,
  includeDisputed: boolean,
): Map<string, number> {
  const dist = new Map<string, number>([[targetId, 0]]);
  const buckets: string[][] = Array.from({ length: maxCost + 1 }, () => []);
  buckets[0]!.push(targetId);
  for (let c = 0; c <= maxCost; c++) {
    for (const id of buckets[c]!) {
      if (dist.get(id) !== c) continue;
      for (const step of adjacency.get(id) ?? []) {
        if (step.disputed && !includeDisputed) continue;
        const next = c + step.cost;
        if (next > maxCost || next >= (dist.get(step.toId) ?? Infinity)) continue;
        dist.set(step.toId, next);
        buckets[next]!.push(step.toId);
      }
    }
  }
  return dist;
}

/**
 * Cheapest simple paths from `fromId` to `toId`, best first. Branches that cannot reach `toId`
 * within the cost budget are cut using the true distance to it, so the search stays small even
 * around hub nodes; `truncated` is set if it still hit the visit limit (results may be incomplete).
 */
export function searchPaths(
  adjacency: Map<string, Step[]>,
  fromId: string,
  toId: string,
  options: PathOptions = {},
): { paths: Path[]; truncated: boolean } {
  const maxCost = options.maxCost ?? 6;
  const limit = options.limit ?? 5;
  let results: Path[] = [];
  const onPath = new Set<string>([fromId]);
  const steps: Step[] = [];
  const toTarget = costsTo(adjacency, toId, maxCost, !!options.includeDisputed);
  let visits = 0;
  let truncated = false;

  const walk = (node: string, cost: number, budget: number) => {
    if (visits++ > MAX_VISITS) {
      truncated = true;
      return;
    }
    // Plenty to choose the best `limit` from; stops a wide graph from listing every path.
    if (results.length >= limit * 20) return;
    for (const step of adjacency.get(node) ?? []) {
      if (step.disputed && !options.includeDisputed) continue;
      if (onPath.has(step.toId)) continue;
      const next = cost + step.cost;
      if (next + (toTarget.get(step.toId) ?? Infinity) > budget) continue;
      steps.push(step);
      if (step.toId === toId) {
        results.push({ steps: [...steps], cost: next });
      } else {
        onPath.add(step.toId);
        walk(step.toId, next, budget);
        onPath.delete(step.toId);
      }
      steps.pop();
    }
  };
  // Raise the cost budget one step at a time, from the cheapest possible chain, and stop as soon
  // as there are enough: short chains come first and long detours are never enumerated.
  const cheapest = toTarget.get(fromId);
  if (cheapest !== undefined) {
    for (let budget = cheapest; budget <= maxCost; budget++) {
      results = [];
      walk(fromId, 0, budget);
      if (results.length >= limit || truncated) break;
    }
  }

  // Two parallel edges between the same nodes make the same chain twice; keep the cheaper.
  const seen = new Set<string>();
  const paths = results
    .sort((a, b) => a.cost - b.cost || a.steps.length - b.steps.length)
    .filter((p) => {
      const key = p.steps.map((s) => s.toId).join(">");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
  return { paths, truncated };
}

/** Cheapest simple paths from `fromId` to `toId`, best first. */
export function findPaths(
  adjacency: Map<string, Step[]>,
  fromId: string,
  toId: string,
  options: PathOptions = {},
): Path[] {
  return searchPaths(adjacency, fromId, toId, options).paths;
}
