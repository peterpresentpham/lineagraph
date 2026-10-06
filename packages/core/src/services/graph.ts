import { sql } from "drizzle-orm";
import { db } from "../db";
import { ServiceError, notFound } from "../errors";
import {
  describeKinship,
  type KinshipTerms,
  kinshipSentence,
  type KinPerson,
  type ParentLink,
  type Sex,
} from "../relations/kinship";
import { sexAwareLabel } from "../relations/roleLabel";
import {
  TENURE_TYPE,
  buildAdjacency,
  searchPaths,
  type RelationEdge,
  type RelationTypeInfo,
  type Step,
  type TenureEdge,
} from "../relations/pathfinder";
import { countHidden, egoBfs, type EgoLink } from "../relations/egograph";
import { GRAPH_CACHE_KEY, cached } from "./cache";
import { parseDate, type DateView } from "./dates";
import { getNodeRelations, getNodeRefs, type NodeRef, type NodeRelation } from "./relationships";
import { LABEL_LANGUAGE } from "./labels";

const variantLabels: Record<string, string> = { adoptive: "nuôi", step: "kế" };

type TypeRow = {
  code: string;
  inverse_code: string | null;
  is_symmetric: boolean;
  category: string;
  label: string | null;
};

// Path search needs every relation, tenure and person; reading them costs several round trips, so
// the loaded graph is kept for a short while and dropped by invalidateGraphCache() on every write.
// Callers only read it.
const loadGraphData = () => cached(GRAPH_CACHE_KEY, 30_000, loadGraphDataUncached);

async function loadGraphDataUncached() {
  const [typeRows, relationRows, tenureRows, personRows, officeLabels] = await Promise.all([
    db.execute<TypeRow>(
      sql`select t.code, t.inverse_code, t.is_symmetric, t.category, l.text as label
          from kg.relation_type t
          left join kg.label l on l.namespace = 'relation_type' and l.code = t.code and l.language = ${LABEL_LANGUAGE}`,
    ),
    db.execute<{
      id: string;
      type: string;
      from_id: string;
      to_id: string;
      variant: string | null;
      label: string | null;
      disputed: boolean;
      importance: number;
    }>(
      sql`select r.id, r.type, r.from_id, r.to_id, r.variant, r.label, r.disputed, r.importance
          from kg.relation r
          join kg.node f on f.id = r.from_id and f.deleted_at is null
          join kg.node t on t.id = r.to_id and t.deleted_at is null`,
    ),
    db.execute<{ id: string; person_id: string; polity_id: string; office_type: string }>(
      sql`select t.id, t.person_id, t.polity_id, t.office_type
          from history.tenure t
          join kg.node p on p.id = t.person_id and p.deleted_at is null
          join kg.node q on q.id = t.polity_id and q.deleted_at is null
          where t.polity_id is not null and t.state = 'accepted'`,
    ),
    db.execute<{ id: string; sex: Sex; birth_edtf: string | null }>(
      sql`select p.id, p.sex, bd.edtf as birth_edtf
          from history.person p
          join kg.node n on n.id = p.id and n.deleted_at is null
          left join history.person_date b on b.person_id = p.id and b.kind = 'birth' and b.is_preferred
          left join kg.fuzzy_date bd on bd.id = b.date_id`,
    ),
    db.execute<{ code: string; text: string }>(
      sql`select code, text from kg.label where namespace = 'office_type' and language = ${LABEL_LANGUAGE}`,
    ),
  ]);

  const types = new Map<string, TypeRow>(typeRows.map((t) => [t.code, t]));
  const typeInfo = new Map<string, RelationTypeInfo>(
    typeRows.map((t) => [
      t.code,
      { code: t.code, inverse: t.inverse_code, symmetric: t.is_symmetric },
    ]),
  );
  const relations: RelationEdge[] = relationRows.map((r) => ({
    id: r.id,
    type: r.type,
    fromId: r.from_id,
    toId: r.to_id,
    variant: r.variant,
    label: r.label,
    disputed: r.disputed,
    importance: r.importance,
  }));
  const tenures: TenureEdge[] = tenureRows.map((t) => ({
    id: t.id,
    personId: t.person_id,
    polityId: t.polity_id,
    officeType: t.office_type,
  }));
  const people = new Map<string, KinPerson>(
    personRows.map((p) => [
      p.id,
      { id: p.id, sex: p.sex, birthYear: parseDate(p.birth_edtf)?.year ?? null },
    ]),
  );
  const offices = new Map(officeLabels.map((o) => [o.code, o.text]));
  return { types, typeInfo, relations, tenures, people, offices };
}

async function resolveNode(slugOrId: string): Promise<NodeRef> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
  const [row] = await db.execute<{ id: string }>(
    sql`select id from kg.node where deleted_at is null and kind in ('person', 'polity')
        and ${isUuid ? sql`id = ${slugOrId}::uuid` : sql`slug = ${slugOrId}`}`,
  );
  if (!row) throw notFound("đối tượng");
  return (await getNodeRefs([row.id])).get(row.id)!;
}

export type PathStepView = {
  from: NodeRef;
  to: NodeRef;
  type: string;
  typeLabel: string;
  /** Extra remarks: adoptive, custom label, disputed. */
  details: string[];
  source: "relation" | "tenure";
  disputed: boolean;
};

export type RelationResult = {
  a: NodeRef;
  b: NodeRef;
  /** Sentence for blood relatives, e.g. "Lê Lợi là ông nội của Lê Thánh Tông"; null otherwise. */
  kinship: {
    sentence: string;
    aIs: string;
    bIs: string;
    note: string | null;
    line: string | null;
    ancestor: NodeRef | null;
  } | null;
  /** Relationships stored directly between the two, as seen from `a`. */
  direct: NodeRelation[];
  /** Chains of relationships linking them, shortest first. */
  paths: { cost: number; steps: PathStepView[] }[];
  /** The search stopped early on a very connected graph, so more chains may exist. */
  truncated: boolean;
};

export async function findRelations(
  aSlug: string,
  bSlug: string,
  options: {
    includeDisputed?: boolean;
    maxCost?: number;
    limit?: number;
    /** Kinship wording: Vietnamese terms (default) or ones that fit any culture. */
    terms?: KinshipTerms;
  } = {},
): Promise<RelationResult> {
  const [a, b] = await Promise.all([resolveNode(aSlug), resolveNode(bSlug)]);
  if (a.id === b.id) throw new ServiceError(400, "Hãy chọn hai đối tượng khác nhau");

  const data = await loadGraphData();
  const adjacency = buildAdjacency(data.relations, data.tenures, data.typeInfo);
  const { paths: rawPaths, truncated } = searchPaths(adjacency, a.id, b.id, {
    maxCost: options.maxCost ?? 6,
    limit: options.limit ?? 5,
    includeDisputed: options.includeDisputed,
  });

  const nodeIds = [...new Set(rawPaths.flatMap((p) => p.steps.flatMap((s) => [s.fromId, s.toId])))];
  const refs = await getNodeRefs(nodeIds);

  const stepView = (s: Step): PathStepView => {
    const from = refs.get(s.fromId)!;
    const to = refs.get(s.toId)!;
    const fromSex = data.people.get(s.fromId)?.sex ?? "unknown";
    const details: string[] = [];
    let typeLabel: string;
    if (s.source === "tenure") {
      const office = data.offices.get(s.variant ?? "") ?? s.variant ?? "chức vụ";
      typeLabel = s.reversed
        ? `Có ${office.toLowerCase()} là`
        : `Giữ chức ${office.toLowerCase()} tại`;
    } else {
      typeLabel = sexAwareLabel(s.type, fromSex, data.types.get(s.type)?.label ?? s.type);
      if (s.variant && variantLabels[s.variant]) details.push(variantLabels[s.variant]!);
      if (s.label) details.push(s.label);
      if (s.disputed) details.push("còn tranh cãi");
    }
    return { from, to, type: s.type, typeLabel, details, source: s.source, disputed: s.disputed };
  };
  const paths = rawPaths
    .filter((p) => p.steps.every((s) => refs.has(s.fromId) && refs.has(s.toId)))
    .map((p) => ({ cost: p.cost, steps: p.steps.map(stepView) }));

  let kinship: RelationResult["kinship"] = null;
  if (a.kind === "person" && b.kind === "person") {
    const links: ParentLink[] = data.relations
      .filter((r) => r.type === "parent_of")
      .map((r) => ({
        parentId: r.fromId,
        childId: r.toId,
        variant: r.variant,
        disputed: r.disputed,
      }));
    const k = describeKinship(a.id, b.id, data.people, links, {
      includeDisputed: options.includeDisputed,
      terms: options.terms,
    });
    if (k) {
      const ancestor = (await getNodeRefs([k.ancestorId])).get(k.ancestorId) ?? null;
      kinship = {
        sentence: kinshipSentence(a.name, b.name, k),
        aIs: k.aIs,
        bIs: k.bIs,
        note: k.note,
        line: k.line,
        ancestor,
      };
    }
  }

  const direct = (await getNodeRelations(a.id)).filter((r) => r.other.id === b.id);
  return { a, b, kinship, direct, paths, truncated };
}

// --- Graph views for the web (nodes + edges, laid out in the browser) ---------------------

export type GraphNode = {
  id: string;
  slug: string;
  kind: "person" | "polity";
  name: string;
  sex: Sex | null;
  birth: DateView | null;
  death: DateView | null;
  /** Offices held in the polity this graph is about, e.g. "Hoàng đế (1428 – 1433)". */
  offices: string[];
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  /** Stored (primary) type: the edge reads source -> target. */
  type: string;
  typeLabel: string;
  category: string;
  symmetric: boolean;
  /** Short text to draw on the edge, e.g. "nuôi" or "Hoàng hậu". */
  text: string | null;
  disputed: boolean;
  /** 1 (minor) to 5 (core). */
  importance: number;
};

export type GraphView = { rootId: string; nodes: GraphNode[]; edges: GraphEdge[] };

async function graphNodes(
  ids: string[],
  officesByNode: Map<string, string[]> = new Map(),
): Promise<GraphNode[]> {
  if (!ids.length) return [];
  const rows = await db.execute<{
    id: string;
    slug: string;
    kind: "person" | "polity";
    name: string;
    sex: Sex | null;
    birth_edtf: string | null;
    death_edtf: string | null;
  }>(
    sql`select n.id, n.slug, n.kind, pn.name, p.sex,
               coalesce(bd.edtf, sd.edtf) as birth_edtf, coalesce(dd.edtf, ed.edtf) as death_edtf
        from kg.node n
        join kg.name pn on pn.node_id = n.id and pn.is_primary
        left join history.person p on p.id = n.id
        left join history.person_date b on b.person_id = p.id and b.kind = 'birth' and b.is_preferred
        left join kg.fuzzy_date bd on bd.id = b.date_id
        left join history.person_date d on d.person_id = p.id and d.kind = 'death' and d.is_preferred
        left join kg.fuzzy_date dd on dd.id = d.date_id
        left join history.polity q on q.id = n.id
        left join kg.fuzzy_date sd on sd.id = q.started_id
        left join kg.fuzzy_date ed on ed.id = q.ended_id
        where n.deleted_at is null and n.id in (${sql.join(
          ids.map((id) => sql`${id}::uuid`),
          sql`, `,
        )})`,
  );
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    kind: r.kind,
    name: r.name,
    sex: r.sex,
    birth: parseDate(r.birth_edtf),
    death: parseDate(r.death_edtf),
    offices: officesByNode.get(r.id) ?? [],
  }));
}

function edgeFrom(
  r: RelationEdge,
  data: Awaited<ReturnType<typeof loadGraphDataUncached>>,
): GraphEdge {
  const t = data.types.get(r.type);
  const fromSex = data.people.get(r.fromId)?.sex ?? "unknown";
  const parts = [
    r.variant && variantLabels[r.variant] ? variantLabels[r.variant] : null,
    r.label,
  ].filter(Boolean);
  return {
    id: r.id,
    source: r.fromId,
    target: r.toId,
    type: r.type,
    typeLabel: sexAwareLabel(r.type, fromSex, t?.label ?? r.type),
    category: t?.category ?? "other",
    symmetric: t?.is_symmetric ?? false,
    text: parts.length ? parts.join(", ") : null,
    disputed: r.disputed,
    importance: r.importance ?? 3,
  };
}

// --- Ego graph: everything around one node, capped, expandable ----------------------------

export type EgoGraphOptions = {
  depth?: number;
  limit?: number;
  /** Only follow these relationship types ("tenure" selects office-holding). Empty = all. */
  types?: string[];
  includeDisputed?: boolean;
  /**
   * Show only links at or above this importance (1-5) when walking from the root; weaker links
   * are counted as "hidden" and appear on load more. Default 5 = just the core of the graph.
   */
  minImportance?: number;
};

/** A GraphView plus, per node, how many neighbours are not drawn yet. */
export type EgoGraphView = GraphView & {
  hidden: Record<string, number>;
  truncated: boolean;
  /** Importance threshold the graph was built with (so the client can show it). */
  minImportance: number;
};

type LinkRow = {
  id: string;
  type: string;
  from_id: string;
  to_id: string;
  variant: string | null;
  label: string | null;
  disputed: boolean;
  importance: number;
  category: string;
  is_symmetric: boolean;
  type_label: string | null;
};

const idList = (ids: Iterable<string>) =>
  sql.join(
    [...ids].map((id) => sql`${id}::uuid`),
    sql`, `,
  );
const RANK: Record<string, number> = { family: 0, politics: 1 };

/** Every relationship and office that touches (or, with `within`, lies inside) a set of nodes. */
async function fetchLinkRows(
  ids: string[],
  opts: EgoGraphOptions,
  within = false,
): Promise<LinkRow[]> {
  if (!ids.length) return [];
  const touch = within
    ? sql`r.from_id in (${idList(ids)}) and r.to_id in (${idList(ids)})`
    : sql`(r.from_id in (${idList(ids)}) or r.to_id in (${idList(ids)}))`;
  const touchTenure = within
    ? sql`t.person_id in (${idList(ids)}) and t.polity_id in (${idList(ids)})`
    : sql`(t.person_id in (${idList(ids)}) or t.polity_id in (${idList(ids)}))`;
  const types = opts.types?.length ? opts.types : null;
  const relationTypes = types?.filter((t) => t !== "tenure") ?? null;
  const wantTenure = !types || types.includes("tenure");
  const disputedFilter = opts.includeDisputed === false ? sql`and not r.disputed` : sql``;

  // Both queries are started before either is awaited: one round trip of waiting, not two.
  const relationsQuery: Promise<LinkRow[]> | LinkRow[] =
    !relationTypes || relationTypes.length
      ? db.execute<LinkRow>(
          sql`select r.id, r.type, r.from_id, r.to_id, r.variant, r.label, r.disputed, r.importance,
                   t.category, t.is_symmetric, l.text as type_label
            from kg.relation r
            join kg.relation_type t on t.code = r.type
            left join kg.label l on l.namespace = 'relation_type' and l.code = r.type and l.language = ${LABEL_LANGUAGE}
            join kg.node f on f.id = r.from_id and f.deleted_at is null
            join kg.node o on o.id = r.to_id and o.deleted_at is null
            where ${touch} ${disputedFilter}
              ${
                relationTypes
                  ? sql`and r.type in (${sql.join(
                      relationTypes.map((t) => sql`${t}`),
                      sql`, `,
                    )})`
                  : sql``
              }`,
        )
      : [];
  const tenuresQuery: Promise<LinkRow[]> | LinkRow[] = wantTenure
    ? db.execute<LinkRow>(
        sql`select 'tenure:' || t.id as id, 'tenure' as type, t.person_id as from_id, t.polity_id as to_id,
                   t.office_type as variant, l.text as label, t.disputed as disputed,
                   ot.importance as importance,
                   'politics' as category, false as is_symmetric, 'Chức vụ' as type_label
            from history.tenure t
            join history.office_type ot on ot.code = t.office_type
            left join kg.label l on l.namespace = 'office_type' and l.code = t.office_type and l.language = ${LABEL_LANGUAGE}
            join kg.node p on p.id = t.person_id and p.deleted_at is null
            join kg.node q on q.id = t.polity_id and q.deleted_at is null
            where t.polity_id is not null and t.state = 'accepted' and ${touchTenure}
              ${opts.includeDisputed === false ? sql`and not t.disputed` : sql``}`,
      )
    : [];
  const [relations, tenures] = await Promise.all([relationsQuery, tenuresQuery]);
  return [...relations, ...tenures];
}

function edgeFromRow(r: LinkRow): GraphEdge {
  const isTenure = r.type === "tenure";
  const parts = isTenure
    ? [r.label]
    : [r.variant && variantLabels[r.variant] ? variantLabels[r.variant] : null, r.label];
  const text = parts.filter(Boolean).join(", ");
  return {
    id: r.id,
    source: r.from_id,
    target: r.to_id,
    type: r.type,
    typeLabel: r.type_label ?? r.type,
    category: r.category,
    symmetric: r.is_symmetric,
    text: text || null,
    disputed: r.disputed,
    importance: r.importance,
  };
}

// Within one importance level, family links come before political and other ones.
const toEgoLinks = (rows: LinkRow[]): EgoLink[] =>
  rows.map((r) => ({
    a: r.from_id,
    b: r.to_id,
    rank: (5 - r.importance) * 10 + (RANK[r.category] ?? 2),
    importance: r.importance,
  }));

/** Edges among `ids`, and how many neighbours of each are still outside `ids`. */
// `minImportance` also hides weaker links between nodes that are already drawn, so the first view
// of a graph shows only the core links rather than every family tie among the drawn nodes.
async function describeSubgraph(ids: Set<string>, opts: EgoGraphOptions, minImportance = 1) {
  const touching = await fetchLinkRows([...ids], opts);
  const edges = touching
    .filter((r) => ids.has(r.from_id) && ids.has(r.to_id) && r.importance >= minImportance)
    .map(edgeFromRow);
  const hidden = Object.fromEntries(countHidden(ids, toEgoLinks(touching)));
  return { edges, hidden };
}

const clamp = (n: number | undefined, min: number, max: number, fallback: number) =>
  Math.min(Math.max(Number.isFinite(n) ? (n as number) : fallback, min), max);

/** Fewest neighbours a first view should show before it falls back to a weaker importance level. */
const EGO_MIN_FIRST_VIEW = 3;

function egoWalk(
  rootId: string,
  depth: number,
  limit: number,
  minImportance: number,
  options: EgoGraphOptions,
) {
  return egoBfs({
    rootIds: [rootId],
    depth,
    limit: limit - 1,
    minImportance,
    fetchLinks: async (ids) => toEgoLinks(await fetchLinkRows(ids, options)),
  });
}

/** The graph around one node: up to `depth` hops, at most `limit` nodes, closest and family first. */
export async function getEgoGraph(
  slugOrId: string,
  options: EgoGraphOptions = {},
): Promise<EgoGraphView> {
  const root = await resolveNode(slugOrId);
  const depth = clamp(options.depth, 1, 4, 2);
  const limit = clamp(options.limit, 5, 200, 40);
  // Every graph opens on the core links only (succession, founding); family and weaker links
  // appear as the viewer loads more. When the caller does not pick a level and the core is nearly
  // empty (data whose links were never graded), fall back to weaker levels so the first view is
  // never a lone node.
  const levels =
    options.minImportance == null ? [5, 3, 1] : [clamp(options.minImportance, 1, 5, 5)];
  let minImportance = levels[0]!;
  let walk = await egoWalk(root.id, depth, limit, minImportance, options);
  for (const level of levels.slice(1)) {
    if (walk.added.length >= EGO_MIN_FIRST_VIEW) break;
    minImportance = level;
    walk = await egoWalk(root.id, depth, limit, minImportance, options);
  }
  const { added, truncated } = walk;
  const ids = new Set([root.id, ...added]);
  const [nodes, { edges, hidden }] = await Promise.all([
    graphNodes([...ids]),
    describeSubgraph(ids, options, minImportance),
  ]);
  return { rootId: root.id, nodes, edges, hidden, truncated, minImportance };
}

/**
 * "Load more" around one node already on screen. Returns only nodes the client does not have
 * (`known`), the edges that join them to the graph, and fresh hidden counts for everything.
 */
export async function expandEgoGraph(
  nodeId: string,
  known: string[],
  options: EgoGraphOptions = {},
): Promise<EgoGraphView> {
  const limit = clamp(options.limit, 1, 100, 30);
  // Loading more around a node reveals everything, most important links first.
  const minImportance = clamp(options.minImportance, 1, 5, 1);
  const knownSet = new Set(known);
  const { added, truncated } = await egoBfs({
    rootIds: [nodeId],
    known: knownSet,
    depth: 1,
    limit,
    minImportance,
    fetchLinks: async (ids) => toEgoLinks(await fetchLinkRows(ids, options)),
  });
  const all = new Set([...knownSet, nodeId, ...added]);
  const [nodes, { edges, hidden }] = await Promise.all([
    graphNodes(added),
    describeSubgraph(all, options),
  ]);
  const newIds = new Set(added);
  return {
    rootId: nodeId,
    nodes,
    // Only edges that involve a new node; the client already has the rest.
    edges: edges.filter((e) => newIds.has(e.source) || newIds.has(e.target)),
    hidden,
    truncated,
    minImportance,
  };
}

/**
 * The relationship tree of a polity: its office-holders plus their close family, and every
 * relationship among them.
 */
export async function getPolityGraph(
  politySlug: string,
  options: { includeFamily?: boolean } = {},
): Promise<GraphView> {
  const polity = await resolveNode(politySlug);
  if (polity.kind !== "polity") throw new ServiceError(400, "Đối tượng này không phải chính thể");
  const data = await loadGraphData();

  const members = new Set<string>();
  const offices = new Map<string, string[]>();
  const tenureRows = await db.execute<{
    person_id: string;
    office_type: string;
    start_edtf: string | null;
    end_edtf: string | null;
  }>(
    sql`select t.person_id, t.office_type, sd.edtf as start_edtf, ed.edtf as end_edtf
        from history.tenure t
        left join kg.fuzzy_date sd on sd.id = t.start_id
        left join kg.fuzzy_date ed on ed.id = t.end_id
        where t.polity_id = ${polity.id}::uuid and t.state = 'accepted'`,
  );
  for (const t of tenureRows) {
    members.add(t.person_id);
    const office = data.offices.get(t.office_type) ?? t.office_type;
    const start = parseDate(t.start_edtf)?.label;
    const end = parseDate(t.end_edtf)?.label;
    offices.set(t.person_id, [
      ...(offices.get(t.person_id) ?? []),
      start || end ? `${office} (${start ?? "?"} – ${end ?? "?"})` : office,
    ]);
  }
  // People tied to the polity itself by a relationship, e.g. its founder.
  for (const r of data.relations) {
    if (r.fromId === polity.id && data.people.has(r.toId)) members.add(r.toId);
    if (r.toId === polity.id && data.people.has(r.fromId)) members.add(r.fromId);
  }

  const included = new Set(members);
  if (options.includeFamily !== false) {
    // Close family (parents, children, spouses) of every member, so the family tree is whole.
    const family = new Set(["parent_of", "spouse_of", "sibling_of"]);
    for (const r of data.relations) {
      if (!family.has(r.type)) continue;
      if (members.has(r.fromId) && data.people.has(r.toId)) included.add(r.toId);
      if (members.has(r.toId) && data.people.has(r.fromId)) included.add(r.fromId);
    }
  }

  const nodes = await graphNodes([...included], offices);
  const present = new Set(nodes.map((n) => n.id));
  const edges = data.relations
    .filter((r) => present.has(r.fromId) && present.has(r.toId))
    .map((r) => edgeFrom(r, data));
  return { rootId: polity.id, nodes, edges };
}

export { TENURE_TYPE };
