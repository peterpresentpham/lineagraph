// Vietnamese kinship terms derived from parent/child links. Pure functions: no database.
//
// Blood relatives are found through the nearest common ancestor. If person A is `k`
// generations below that ancestor and B is `m` generations below, the pair (k, m) decides the
// term: (0, 2) grandparent/grandchild, (1, 1) siblings, (2, 1) uncle-aunt/nephew-niece,
// (2, 2) first cousins, and so on. Beyond the named cases the answer is "cùng tổ N đời",
// followed by "theo dòng cha" / "theo dòng mẹ" when the whole line is on one side.

export type Sex = "male" | "female" | "unknown";

export type KinPerson = { id: string; sex: Sex; birthYear: number | null };

export type ParentLink = {
  parentId: string;
  childId: string;
  variant: string | null; // biological | adoptive | step
  disputed: boolean;
};

export type KinshipOptions = { includeDisputed?: boolean };

export type Kinship = {
  /** What A is to B, e.g. "ông nội" ("A là ông nội của B"). */
  aIs: string;
  /** What B is to A, e.g. "cháu nội". */
  bIs: string;
  /** Nearest common ancestor and how many generations A and B are below it. */
  ancestorId: string;
  aGenerations: number;
  bGenerations: number;
  /** "cha" / "mẹ" when every step on the path is through fathers / mothers. */
  line: "cha" | "mẹ" | "lẫn" | null;
  /** Person ids from A up to the common ancestor, and from B up to it. */
  pathA: string[];
  pathB: string[];
  /** One path goes through an adoptive link. */
  adoptive: boolean;
  /** Extra remark, e.g. "cùng cha khác mẹ" or "con chú bác". */
  note: string | null;
};

type UpPath = { ids: string[]; adoptive: boolean };

const MAX_GENERATIONS = 12;
const MAX_PATHS = 4000;

/** All upward paths from `startId` (start included), grouped by the ancestor reached. */
function ancestorPaths(startId: string, parentsOf: Map<string, ParentLink[]>) {
  const found = new Map<string, UpPath[]>();
  found.set(startId, [{ ids: [startId], adoptive: false }]);
  let frontier: UpPath[] = [{ ids: [startId], adoptive: false }];
  let total = 1;
  for (let gen = 0; gen < MAX_GENERATIONS && frontier.length && total < MAX_PATHS; gen++) {
    const next: UpPath[] = [];
    for (const path of frontier) {
      const last = path.ids[path.ids.length - 1]!;
      for (const link of parentsOf.get(last) ?? []) {
        if (path.ids.includes(link.parentId)) continue;
        const extended = { ids: [...path.ids, link.parentId], adoptive: path.adoptive || link.variant === "adoptive" };
        next.push(extended);
        const list = found.get(link.parentId) ?? [];
        list.push(extended);
        found.set(link.parentId, list);
        total++;
      }
    }
    frontier = next;
  }
  return found;
}

export function describeKinship(
  aId: string,
  bId: string,
  people: Map<string, KinPerson>,
  links: ParentLink[],
  options: KinshipOptions = {},
): Kinship | null {
  if (aId === bId) return null;

  // Step-parents are in-law style links, not blood; disputed links only on request.
  const parentsOf = new Map<string, ParentLink[]>();
  for (const link of links) {
    if (link.variant === "step") continue;
    if (link.disputed && !options.includeDisputed) continue;
    parentsOf.set(link.childId, [...(parentsOf.get(link.childId) ?? []), link]);
  }

  const upA = ancestorPaths(aId, parentsOf);
  const upB = ancestorPaths(bId, parentsOf);

  let best: { pa: UpPath; pb: UpPath; score: number } | null = null;
  for (const [ancestor, pathsA] of upA) {
    const pathsB = upB.get(ancestor);
    if (!pathsB) continue;
    for (const pa of pathsA) {
      for (const pb of pathsB) {
        // Shortest total distance wins; blood links beat adoptive ones on a tie.
        const score = (pa.ids.length + pb.ids.length) * 10 + (pa.adoptive || pb.adoptive ? 1 : 0);
        if (!best || score < best.score) best = { pa, pb, score };
      }
    }
  }
  if (!best) return null;

  const k = best.pa.ids.length - 1;
  const m = best.pb.ids.length - 1;
  const ancestorId = best.pa.ids[k]!;
  const ctx: Ctx = { people, parentsOf };
  const pathA = best.pa.ids;
  const pathB = best.pb.ids;

  const far = termOf(aId, bId, pathA, pathB, ctx);
  const farReverse = termOf(bId, aId, pathB, pathA, ctx);

  return {
    aIs: far.term,
    bIs: farReverse.term,
    ancestorId,
    aGenerations: k,
    bGenerations: m,
    line: lineOf(pathA, pathB, people),
    pathA,
    pathB,
    adoptive: best.pa.adoptive || best.pb.adoptive,
    note: far.note ?? farReverse.note,
  };
}

type Ctx = { people: Map<string, KinPerson>; parentsOf: Map<string, ParentLink[]> };

const sexOf = (ctx: Ctx, id: string): Sex => ctx.people.get(id)?.sex ?? "unknown";

/** Positive when `x` is older than `y`, negative when younger, 0 when unknown or equal. */
function olderThan(ctx: Ctx, x: string, y: string): number {
  const bx = ctx.people.get(x)?.birthYear;
  const by = ctx.people.get(y)?.birthYear;
  if (bx == null || by == null || bx === by) return 0;
  return bx < by ? 1 : -1;
}

/** Side of the family: "nội" when the person is a father's line, "ngoại" for a mother's. */
function side(sex: Sex): "nội" | "ngoại" | null {
  return sex === "male" ? "nội" : sex === "female" ? "ngoại" : null;
}

const withSide = (word: string, s: "nội" | "ngoại" | null) => (s ? `${word} ${s}` : word);

/**
 * What `x` is to `y`. `pathX` / `pathY` run from each person up to the common ancestor
 * (person first, ancestor last), so their lengths minus one are the generation gaps.
 */
function termOf(
  x: string,
  y: string,
  pathX: string[],
  pathY: string[],
  ctx: Ctx,
): { term: string; note: string | null } {
  const k = pathX.length - 1;
  const m = pathY.length - 1;
  const xSex = sexOf(ctx, x);

  // x is an ancestor of y.
  if (k === 0) {
    const via = pathY[1] ? side(sexOf(ctx, pathY[1])) : null; // y's parent decides nội / ngoại
    if (m === 1) return { term: pick(xSex, "cha", "mẹ", "cha/mẹ"), note: null };
    if (m === 2) return { term: withSide(pick(xSex, "ông", "bà", "ông/bà"), via), note: null };
    if (m === 3) return { term: `${pick(xSex, "cụ ông", "cụ bà", "cụ")}${via ? ` bên ${via}` : ""}`, note: null };
    if (m === 4) return { term: `kỵ${via ? ` bên ${via}` : ""}`, note: null };
    return { term: `tổ ${m} đời`, note: lineNote(pathY, ctx) };
  }

  // x is a descendant of y.
  if (m === 0) {
    const via = pathX[1] ? side(sexOf(ctx, pathX[1])) : null;
    if (k === 1) return { term: pick(xSex, "con trai", "con gái", "con"), note: null };
    if (k === 2) return { term: withSide("cháu", via), note: null };
    if (k === 3) return { term: "chắt", note: null };
    if (k === 4) return { term: "chút", note: null };
    return { term: `hậu duệ ${k} đời`, note: lineNote(pathX, ctx) };
  }

  // Siblings.
  if (k === 1 && m === 1) {
    const cmp = olderThan(ctx, x, y);
    const term =
      cmp > 0 ? pick(xSex, "anh", "chị", "anh/chị") : cmp < 0 ? "em" : pick(xSex, "anh/em trai", "chị/em gái", "anh chị em");
    return { term, note: siblingNote(pathX, pathY, ctx) };
  }

  // x is a sibling of y's parent: uncle / aunt.
  if (k === 1 && m === 2) {
    const parent = pathY[1]!;
    const parentSex = sexOf(ctx, parent);
    const cmp = olderThan(ctx, x, parent);
    if (parentSex === "female") return { term: pick(xSex, "cậu", "dì", "cậu/dì"), note: null };
    if (xSex === "female") return { term: "cô", note: null };
    if (xSex === "male") return { term: cmp > 0 ? "bác" : cmp < 0 ? "chú" : "bác/chú", note: null };
    return { term: "bác/chú/cô", note: null };
  }

  // x is the child of y's sibling: nephew / niece.
  if (k === 2 && m === 1) return { term: pick(xSex, "cháu trai", "cháu gái", "cháu"), note: null };

  // x is a sibling of y's grandparent.
  if (k === 1 && m === 3) {
    const grand = pathY[2]!;
    const grandSex = sexOf(ctx, grand);
    const cmp = olderThan(ctx, x, grand);
    if (xSex === "male") {
      if (grandSex === "female") return { term: "ông cậu", note: null };
      return { term: cmp > 0 ? "ông bác" : cmp < 0 ? "ông chú" : "ông bác/chú", note: null };
    }
    if (xSex === "female") return { term: grandSex === "female" ? "bà dì" : "bà cô", note: null };
    return { term: "ông/bà (anh chị em của ông bà)", note: null };
  }

  // x is the grandchild of y's sibling.
  if (k === 3 && m === 1) return { term: "cháu (cháu của anh chị em ruột của ông bà)", note: null };

  // First cousins.
  if (k === 2 && m === 2) {
    const cmp = olderThan(ctx, x, y);
    const term =
      cmp > 0
        ? pick(xSex, "anh họ", "chị họ", "anh/chị họ")
        : cmp < 0
          ? "em họ"
          : pick(xSex, "anh/em họ", "chị/em họ", "anh chị em họ");
    const bothFathers = sexOf(ctx, pathX[1]!) === "male" && sexOf(ctx, pathY[1]!) === "male";
    return { term, note: bothFathers ? "con chú bác" : "con cô cậu dì" };
  }

  // Everything further: same ancestor, counted in generations.
  const generations = Math.max(k, m);
  const line = lineOf(pathX, pathY, ctx.people);
  const lineText = line === "cha" ? " theo dòng cha" : line === "mẹ" ? " theo dòng mẹ" : "";
  return { term: "họ hàng xa", note: `cùng tổ ${generations} đời${lineText}` };
}

function pick(sex: Sex, male: string, female: string, unknown: string) {
  return sex === "male" ? male : sex === "female" ? female : unknown;
}

/** "theo dòng cha" / "theo dòng mẹ" for a single upward path, or null when mixed. */
function lineNote(path: string[], ctx: Ctx): string | null {
  const line = lineOfPath(path, ctx.people);
  return line === "cha" ? "theo dòng cha" : line === "mẹ" ? "theo dòng mẹ" : null;
}

function siblingNote(pathX: string[], pathY: string[], ctx: Ctx): string | null {
  // Same parents on both sides? Look at whichever parent they do not share.
  const parentsX = (ctx.parentsOf.get(pathX[0]!) ?? []).map((l) => l.parentId);
  const parentsY = (ctx.parentsOf.get(pathY[0]!) ?? []).map((l) => l.parentId);
  const shared = parentsX.filter((p) => parentsY.includes(p));
  // Only claim "half" when both sides have two recorded parents; a missing parent is unknown, not different.
  if (shared.length === 1 && parentsX.length > 1 && parentsY.length > 1) {
    return sexOf(ctx, shared[0]!) === "male" ? "cùng cha khác mẹ" : sexOf(ctx, shared[0]!) === "female" ? "cùng mẹ khác cha" : "chỉ chung một người cha/mẹ";
  }
  return null;
}

function lineOfPath(path: string[], people: Map<string, KinPerson>): "cha" | "mẹ" | "lẫn" | null {
  // Everyone above the starting person, i.e. each ancestor on the way up.
  const above = path.slice(1);
  if (!above.length) return null;
  const sexes = above.map((id) => people.get(id)?.sex ?? "unknown");
  if (sexes.every((s) => s === "male")) return "cha";
  if (sexes.every((s) => s === "female")) return "mẹ";
  return "lẫn";
}

function lineOf(pathA: string[], pathB: string[], people: Map<string, KinPerson>) {
  const a = lineOfPath(pathA, people);
  const b = lineOfPath(pathB, people);
  if (a === null) return b;
  if (b === null) return a;
  return a === b ? a : "lẫn";
}

/** Headline sentence for the UI, e.g. "A là ông nội của B". */
export function kinshipSentence(nameA: string, nameB: string, k: Kinship): string {
  const base = `${nameA} là ${k.aIs} của ${nameB}`;
  const extras: string[] = [];
  if (k.note) extras.push(k.note);
  if (k.adoptive) extras.push("có quan hệ nuôi");
  return extras.length ? `${base} (${extras.join(", ")})` : base;
}
