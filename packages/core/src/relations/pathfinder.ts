// Finds the chains of relationships that connect two nodes. Pure functions: no database.
//
// The graph is built from stored relations (one row per fact, in the primary direction of
// their type) plus tenures (person held an office in a polity). Every edge can be walked in
// both directions; the reverse of a relation uses the inverse type (parent_of -> child_of).

export type RelationTypeInfo = { code: string; inverse: string | null; symmetric: boolean };

export type RelationEdge = {
  id: string;
  type: string;
  fromId: string;
  toId: string;
  variant: string | null;
  label: string | null;
  disputed: boolean;
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
  const add = (step: Step) => adjacency.set(step.fromId, [...(adjacency.get(step.fromId) ?? []), step]);

  for (const r of relations) {
    const info = types.get(r.type);
    const base = { edgeId: r.id, variant: r.variant, label: r.label, disputed: r.disputed, source: "relation" as const, cost: 1 };
    add({ ...base, fromId: r.fromId, toId: r.toId, type: r.type, reversed: false });
    const reverseType = info?.symmetric ? r.type : (info?.inverse ?? r.type);
    add({ ...base, fromId: r.toId, toId: r.fromId, type: reverseType, reversed: !info?.symmetric });
  }
  for (const t of tenures) {
    const base = { edgeId: t.id, variant: t.officeType, label: null, disputed: false, source: "tenure" as const, cost: TENURE_COST, type: TENURE_TYPE };
    add({ ...base, fromId: t.personId, toId: t.polityId, reversed: false });
    add({ ...base, fromId: t.polityId, toId: t.personId, reversed: true });
  }
  return adjacency;
}

const MAX_VISITS = 100_000;

/** Cheapest simple paths from `fromId` to `toId`, best first. */
export function findPaths(
  adjacency: Map<string, Step[]>,
  fromId: string,
  toId: string,
  options: PathOptions = {},
): Path[] {
  const maxCost = options.maxCost ?? 6;
  const limit = options.limit ?? 5;
  const results: Path[] = [];
  const onPath = new Set<string>([fromId]);
  const steps: Step[] = [];
  let visits = 0;

  const walk = (node: string, cost: number) => {
    if (visits++ > MAX_VISITS) return;
    for (const step of adjacency.get(node) ?? []) {
      if (step.disputed && !options.includeDisputed) continue;
      if (onPath.has(step.toId)) continue;
      const next = cost + step.cost;
      if (next > maxCost) continue;
      steps.push(step);
      if (step.toId === toId) {
        results.push({ steps: [...steps], cost: next });
      } else {
        onPath.add(step.toId);
        walk(step.toId, next);
        onPath.delete(step.toId);
      }
      steps.pop();
    }
  };
  walk(fromId, 0);

  // Two parallel edges between the same nodes make the same chain twice; keep the cheaper.
  const seen = new Set<string>();
  return results
    .sort((a, b) => a.cost - b.cost || a.steps.length - b.steps.length)
    .filter((p) => {
      const key = p.steps.map((s) => s.toId).join(">");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
