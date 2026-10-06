import { sql } from "drizzle-orm";
import { db } from "../db";
import { TIMELINE_CACHE_KEY, cached } from "./cache";
import {
  astronomicalYear,
  centuryOfYear,
  gregorianJdn,
  parseDate,
  yearOfJdn,
  yearsOfCentury,
} from "./dates";
import { getPersonSummaries } from "./persons";
import { likeContains, likePrefix, normalizeText } from "./text";

export type SearchKind = "person" | "polity" | "event";
const SEARCH_KINDS: SearchKind[] = ["person", "polity", "event"];

/** Keeps only the known kinds (the list ends up in SQL, so it is never taken as given). */
export function parseSearchKinds(list: string[] | undefined): SearchKind[] {
  const kinds = (list ?? []).filter((k): k is SearchKind => SEARCH_KINDS.includes(k as SearchKind));
  return kinds.length > 0 ? kinds : SEARCH_KINDS;
}

export async function search(q: string, kinds: SearchKind[] = SEARCH_KINDS) {
  const needle = normalizeText(q);
  if (!needle) return [];
  const rows = await db.execute<{
    id: string;
    kind: string;
    slug: string;
    name: string;
    matched: string;
  }>(
    // Each node keeps its best-matching name (exact, then prefix, then shortest); results are then
    // ranked the same way and cut to 30, so the limit never drops a better match for a worse one.
    sql`select id, kind, slug, name, matched from (
          select distinct on (n.id) n.id, n.kind, n.slug, pn.name, m.name as matched,
                 case when m.name_normalized = ${needle} then 0
                      when m.name_normalized like ${likePrefix(needle)} then 1
                      else 2 end as rank,
                 length(m.name_normalized) as len
          from kg.name m
          join kg.node n on n.id = m.node_id and n.deleted_at is null
            and n.kind in (${sql.join(
              parseSearchKinds(kinds).map((k) => sql`${k}`),
              sql`, `,
            )})
          join kg.name pn on pn.node_id = n.id and pn.is_primary
          where m.name_normalized like ${likeContains(needle)}
          order by n.id, rank, len
        ) best
        order by rank, len, name
        limit 30`,
  );
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as SearchKind,
    slug: r.slug,
    name: r.name,
    matched: r.matched,
  }));
}

/** The slug of one random live node of a kind, for "show me something"; null when there is none. */
export async function randomSlug(kind: SearchKind): Promise<string | null> {
  const [row] = await db.execute<{ slug: string }>(
    sql`select slug from kg.node where kind = ${kind} and deleted_at is null order by random() limit 1`,
  );
  return row?.slug ?? null;
}

/**
 * Near matches for a query that found nothing, by trigram similarity over every name, so a typo
 * ("trinh sm") still points somewhere. Best match per node, at most 8.
 */
export async function searchSimilar(q: string, kinds: SearchKind[] = SEARCH_KINDS) {
  const needle = normalizeText(q);
  if (needle.length < 3) return [];
  const rows = await db.execute<{ kind: string; slug: string; name: string }>(
    sql`select kind, slug, name from (
          select distinct on (n.id) n.id, n.kind, n.slug, pn.name,
                 similarity(m.name_normalized, ${needle}) as score
          from kg.name m
          join kg.node n on n.id = m.node_id and n.deleted_at is null
            and n.kind in (${sql.join(
              parseSearchKinds(kinds).map((k) => sql`${k}`),
              sql`, `,
            )})
          join kg.name pn on pn.node_id = n.id and pn.is_primary
          where m.name_normalized % ${needle}
          order by n.id, score desc
        ) best
        order by score desc, name
        limit 8`,
  );
  return rows.map((r) => ({ kind: r.kind as SearchKind, slug: r.slug, name: r.name }));
}

// Walks parentage up (ancestors) or down (descendants) from one person, depth-limited.
export async function getLineage(
  personId: string,
  direction: "ancestors" | "descendants",
  maxDepth = 6,
) {
  const depth = Math.min(Math.max(maxDepth, 1), 12);
  // parent_of runs parent (from_id) -> child (to_id).
  const [from, to] = direction === "ancestors" ? ["to_id", "from_id"] : ["from_id", "to_id"];
  const rows = await db.execute<{ id: string; depth: number }>(
    sql`with recursive walk(id, depth) as (
          select ${personId}::uuid, 0
          union
          select pa.${sql.raw(to)}, walk.depth + 1
          from kg.relation pa join walk on pa.${sql.raw(from)} = walk.id and pa.type = 'parent_of'
          join kg.node live on live.id = pa.${sql.raw(to)} and live.deleted_at is null
          where walk.depth < ${depth}
        ) select id, min(depth)::int as depth from walk group by id`,
  );
  const ids = rows.map((r) => r.id);
  const people = await getPersonSummaries(ids);
  const depthById = new Map(rows.map((r) => [r.id, r.depth]));
  const edges = await db.execute<{ parent_id: string; child_id: string; kind: string }>(
    sql`select from_id as parent_id, to_id as child_id, coalesce(variant, 'biological') as kind from kg.relation
        where type = 'parent_of'
          and from_id in (${sql.join(
            ids.map((id) => sql`${id}::uuid`),
            sql`, `,
          )})
          and to_id in (${sql.join(
            ids.map((id) => sql`${id}::uuid`),
            sql`, `,
          )})`,
  );
  return {
    rootId: personId,
    people: people.map((p) => ({ ...p, depth: depthById.get(p.id) ?? 0 })),
    edges: edges.map((e) => ({ parentId: e.parent_id, childId: e.child_id, kind: e.kind })),
  };
}

export type TimelineEntry = {
  kind: "person" | "polity" | "event";
  slug: string;
  name: string;
  start: ReturnType<typeof parseDate>;
  end: ReturnType<typeof parseDate>;
  /** Historicity (person), polity type or event type. */
  detail: string | null;
};

// One query for everything that has a start date, as (kind, slug, name, dates, detail, sort key).
// Ordered by the date's day number, not its text: "-0100" sorts before "-0500" as a string.
const timelineUnion = sql`
  select 'polity' as kind, n.slug, pn.name, sd.edtf as start_edtf, ed.edtf as end_edtf,
         p.polity_type as detail, sd.earliest_jdn as sort_key
  from kg.node n join history.polity p on p.id = n.id
  join kg.name pn on pn.node_id = n.id and pn.is_primary
  left join kg.fuzzy_date sd on sd.id = p.started_id
  left join kg.fuzzy_date ed on ed.id = p.ended_id
  where n.deleted_at is null and sd.edtf is not null
  union all
  select 'person', n.slug, pn.name, bd.edtf, dd.edtf, p.historicity, bd.earliest_jdn
  from kg.node n join history.person p on p.id = n.id
  join kg.name pn on pn.node_id = n.id and pn.is_primary
  join history.person_date b on b.person_id = p.id and b.kind = 'birth' and b.is_preferred
  join kg.fuzzy_date bd on bd.id = b.date_id
  left join history.person_date d on d.person_id = p.id and d.kind = 'death' and d.is_preferred
  left join kg.fuzzy_date dd on dd.id = d.date_id
  where n.deleted_at is null
  union all
  select 'event', n.slug, en.name, sd.edtf, ed.edtf, e.event_type, sd.earliest_jdn
  from kg.node n join history.event e on e.id = n.id
  join kg.name en on en.node_id = n.id and en.is_primary
  join kg.fuzzy_date sd on sd.id = e.start_id
  left join kg.fuzzy_date ed on ed.id = e.end_id
  where n.deleted_at is null`;

/**
 * The entries that begin in one century (see `centuryOfYear`), in date order. Without a century
 * it returns the earliest entries, up to `limit`, so no caller can ask for the whole table.
 */
export async function getTimeline(opts: { century?: number; year?: number; limit?: number } = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 500, 1), 1000);
  const range =
    opts.year !== undefined && opts.year !== 0
      ? sql`where sort_key between ${gregorianJdn(astronomicalYear(opts.year), 1, 1)}
            and ${gregorianJdn(astronomicalYear(opts.year), 12, 31)}`
      : opts.century !== undefined && opts.century !== 0
        ? (() => {
            const [from, to] = yearsOfCentury(opts.century!);
            return sql`where sort_key between ${gregorianJdn(astronomicalYear(from), 1, 1)}
                     and ${gregorianJdn(astronomicalYear(to), 12, 31)}`;
          })()
        : sql``;
  const rows = await db.execute<{
    kind: string;
    slug: string;
    name: string;
    start_edtf: string | null;
    end_edtf: string | null;
    detail: string | null;
  }>(sql`select * from (${timelineUnion}) t ${range} order by sort_key, name limit ${limit}`);
  return rows.map((r): TimelineEntry => ({
    kind: r.kind as TimelineEntry["kind"],
    slug: r.slug,
    name: r.name,
    start: parseDate(r.start_edtf),
    end: parseDate(r.end_edtf),
    detail: r.detail,
  }));
}

/** How many entries begin in each century, earliest first; cached, since every visit needs it. */
export function getTimelineIndex(): Promise<{ century: number; count: number }[]> {
  return cached(TIMELINE_CACHE_KEY, 60_000, async () => {
    const rows = await db.execute<{ sort_key: number }>(
      sql`select sort_key from (${timelineUnion}) t where sort_key is not null`,
    );
    const counts = new Map<number, number>();
    for (const r of rows) {
      const century = centuryOfYear(yearOfJdn(Number(r.sort_key)));
      counts.set(century, (counts.get(century) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([century, count]) => ({ century, count }))
      .sort((a, b) => a.century - b.century);
  });
}

export async function getStats() {
  const [row] = await db.execute<Record<string, number>>(
    sql`select
          (select count(*)::int from kg.node where kind = 'person' and deleted_at is null) as persons,
          (select count(*)::int from kg.node where kind = 'polity' and deleted_at is null) as polities,
          (select count(*)::int from history.tenure t
             join kg.node p on p.id = t.person_id and p.deleted_at is null
             join kg.node q on q.id = t.polity_id and q.deleted_at is null) as tenures,
          (select count(*)::int from kg.node where kind = 'event' and deleted_at is null) as events,
          (select count(*)::int from kg.relation r
             join kg.node f on f.id = r.from_id and f.deleted_at is null
             join kg.node t on t.id = r.to_id and t.deleted_at is null) as relations,
          (select count(*)::int from kg.relation_type where is_primary) as relation_types,
          (select count(*)::int from kg.source) as sources`,
  );
  return row!;
}
