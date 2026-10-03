import { sql } from "drizzle-orm";
import { db } from "../db";
import { parseDate } from "./dates";
import { getPersonSummaries } from "./persons";
import { normalizeText } from "./text";

export async function search(q: string) {
  const needle = normalizeText(q);
  if (!needle) return [];
  const rows = await db.execute<{
    id: string;
    kind: string;
    slug: string;
    name: string;
    matched: string;
  }>(
    sql`select distinct on (n.id) n.id, n.kind, n.slug, pn.name, m.name as matched
        from kg.name m
        join kg.node n on n.id = m.node_id and n.deleted_at is null and n.kind in ('person', 'polity')
        join kg.name pn on pn.node_id = n.id and pn.is_primary
        where m.name_normalized like ${"%" + needle + "%"}
        order by n.id, (m.name_normalized = ${needle}) desc
        limit 30`,
  );
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as "person" | "polity",
    slug: r.slug,
    name: r.name,
    matched: r.matched,
  }));
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

export async function getTimeline() {
  const rows = await db.execute<{
    kind: string;
    slug: string;
    name: string;
    start_edtf: string | null;
    end_edtf: string | null;
    detail: string | null;
  }>(
    sql`select 'polity' as kind, n.slug, pn.name, sd.edtf as start_edtf, ed.edtf as end_edtf, p.polity_type as detail
        from kg.node n join history.polity p on p.id = n.id
        join kg.name pn on pn.node_id = n.id and pn.is_primary
        left join kg.fuzzy_date sd on sd.id = p.started_id
        left join kg.fuzzy_date ed on ed.id = p.ended_id
        where n.deleted_at is null and sd.edtf is not null
        union all
        select 'person', n.slug, pn.name, bd.edtf, dd.edtf, p.historicity
        from kg.node n join history.person p on p.id = n.id
        join kg.name pn on pn.node_id = n.id and pn.is_primary
        join history.person_date b on b.person_id = p.id and b.kind = 'birth' and b.is_preferred
        join kg.fuzzy_date bd on bd.id = b.date_id
        left join history.person_date d on d.person_id = p.id and d.kind = 'death' and d.is_preferred
        left join kg.fuzzy_date dd on dd.id = d.date_id
        where n.deleted_at is null
        order by 4`,
  );
  return rows.map((r) => ({
    kind: r.kind as "person" | "polity",
    slug: r.slug,
    name: r.name,
    start: parseDate(r.start_edtf),
    end: parseDate(r.end_edtf),
    detail: r.detail,
  }));
}

export async function getStats() {
  const [row] = await db.execute<Record<string, number>>(
    sql`select
          (select count(*)::int from kg.node where kind = 'person' and deleted_at is null) as persons,
          (select count(*)::int from kg.node where kind = 'polity' and deleted_at is null) as polities,
          (select count(*)::int from history.tenure) as tenures,
          (select count(*)::int from kg.relation) as relations,
          (select count(*)::int from kg.relation_type where is_primary) as relation_types,
          (select count(*)::int from kg.source) as sources`,
  );
  return row!;
}
