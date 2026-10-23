import { loadGraphData, relationStepLabel } from "./graph";
import { buildAdjacency, type Step } from "../relations/pathfinder";
import { getNodeRefs, type NodeRef } from "./relationships";
import { ServiceError, notFound } from "../errors";
import { db } from "../db";
import { sql } from "drizzle-orm";
import type { Sex } from "../relations/kinship";

// "Thử thách nối hai người": a game on the family graph. The player starts at one person and walks
// from relative to relative until they reach the other. Only person-to-person relationships count
// (a dynasty would link every emperor in two steps and make every puzzle trivial), and disputed
// ones are left out so the shortest route is something nobody argues about.

const MIN_HOPS = 3;
const MAX_HOPS = 6;
const PREFERRED_HOPS = 4;

/** Small seeded generator, so the same date always gives the same pair. */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** People-only steps: relationships between two persons that are not in dispute. */
async function personGraph() {
  const data = await loadGraphData();
  const adjacency = buildAdjacency(data.relations, [], data.typeInfo);
  const people = new Map<string, Step[]>();
  for (const [id, steps] of adjacency) {
    if (!data.people.has(id)) continue;
    const usable = steps.filter((s) => !s.disputed && data.people.has(s.toId));
    if (usable.length > 0) people.set(id, usable);
  }
  return { data, people };
}

/** Fewest steps from `fromId` to everyone it can reach, up to `limit` steps. */
function hopsFrom(graph: Map<string, Step[]>, fromId: string, limit: number) {
  const dist = new Map<string, number>([[fromId, 0]]);
  let frontier = [fromId];
  for (let d = 1; d <= limit && frontier.length > 0; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const step of graph.get(id) ?? []) {
        if (dist.has(step.toId)) continue;
        dist.set(step.toId, d);
        next.push(step.toId);
      }
    }
    frontier = next;
  }
  return dist;
}

export type Challenge = {
  seed: string;
  a: NodeRef;
  b: NodeRef;
  /** Fewest steps between them: the number to beat. */
  par: number;
};

/**
 * The pair for a seed (a date for the daily challenge, anything for a random one), or null when
 * the family graph is too small or too sparse to make a puzzle.
 */
export async function getChallenge(seed: string): Promise<Challenge | null> {
  const { people } = await personGraph();
  const starts = [...people.keys()].sort();
  if (starts.length < 2) return null;
  const random = seededRandom(seed);
  for (let attempt = 0; attempt < 40; attempt++) {
    const aId = starts[Math.floor(random() * starts.length)]!;
    const dist = hopsFrom(people, aId, MAX_HOPS);
    const options = [...dist.entries()].filter(([, d]) => d >= MIN_HOPS && d <= MAX_HOPS);
    if (options.length === 0) continue;
    // Prefer a medium puzzle, but take what the data allows.
    const medium = options.filter(([, d]) => d === PREFERRED_HOPS);
    const pool = (medium.length > 0 ? medium : options).map(([id]) => id).sort();
    const bId = pool[Math.floor(random() * pool.length)]!;
    const refs = await getNodeRefs([aId, bId]);
    const a = refs.get(aId);
    const b = refs.get(bId);
    if (!a || !b) continue;
    return { seed, a, b, par: dist.get(bId)! };
  }
  return null;
}

export type Neighbor = {
  node: NodeRef;
  /** How the neighbour is related, read from the current person: "Là cha của". */
  typeLabel: string;
  details: string[];
};

const MAX_NEIGHBORS = 60;

/** Relatives of one person, for the player's next step. */
export async function getChallengeNeighbors(slug: string): Promise<Neighbor[]> {
  const [row] = await db.execute<{ id: string }>(
    sql`select id from kg.node where deleted_at is null and kind = 'person' and slug = ${slug}`,
  );
  if (!row) throw notFound("nhân vật");
  const { data, people } = await personGraph();
  const steps = people.get(row.id) ?? [];
  const seen = new Set<string>();
  const unique = steps.filter((s) => (seen.has(s.toId) ? false : (seen.add(s.toId), true)));
  if (unique.length > MAX_NEIGHBORS * 2) {
    throw new ServiceError(400, "Nhân vật này có quá nhiều quan hệ để chơi");
  }
  const refs = await getNodeRefs(unique.map((s) => s.toId));
  const fromSex: Sex = data.people.get(row.id)?.sex ?? "unknown";
  return unique
    .filter((s) => refs.has(s.toId))
    .slice(0, MAX_NEIGHBORS)
    .map((s) => ({ node: refs.get(s.toId)!, ...relationStepLabel(data, s, fromSex) }))
    .sort((x, y) => x.node.name.localeCompare(y.node.name, "vi"));
}

export type RouteStep = { node: NodeRef; typeLabel: string; details: string[] };

/**
 * A shortest route between two people, step by step, or null when none exists. It is what a hint
 * shows (the first step) and what the end screen reveals (all of it).
 */
export async function getChallengeRoute(
  fromSlug: string,
  toSlug: string,
): Promise<RouteStep[] | null> {
  const rows = await db.execute<{ id: string; slug: string }>(
    sql`select id, slug from kg.node where deleted_at is null and kind = 'person'
        and slug in (${fromSlug}, ${toSlug})`,
  );
  const fromId = rows.find((r) => r.slug === fromSlug)?.id;
  const toId = rows.find((r) => r.slug === toSlug)?.id;
  if (!fromId || !toId) throw notFound("nhân vật");
  if (fromId === toId) return [];
  const { data, people } = await personGraph();

  const via = new Map<string, Step>([]);
  const seen = new Set<string>([fromId]);
  let frontier = [fromId];
  search: while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const step of people.get(id) ?? []) {
        if (seen.has(step.toId)) continue;
        seen.add(step.toId);
        via.set(step.toId, step);
        if (step.toId === toId) break search;
        next.push(step.toId);
      }
    }
    frontier = next;
  }
  if (!via.has(toId)) return null;

  const chain: Step[] = [];
  for (let at = toId; at !== fromId; at = via.get(at)!.fromId) chain.unshift(via.get(at)!);
  const refs = await getNodeRefs(chain.map((s) => s.toId));
  return chain
    .filter((s) => refs.has(s.toId))
    .map((s) => ({
      node: refs.get(s.toId)!,
      ...relationStepLabel(data, s, data.people.get(s.fromId)?.sex ?? "unknown"),
    }));
}
