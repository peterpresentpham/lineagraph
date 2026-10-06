import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { notFound } from "../errors";
import { polity } from "../schema/history";
import { node } from "../schema/kg";
import type { PolityInput } from "../validation";
import { dateInsert, parseDate } from "./dates";
import { nameAttributeCtes, softDeleteNode, uniqueSlug } from "./node";
import { getNodeRelations } from "./relationships";
import { likeContains, normalizeText } from "./text";
import { LABEL_LANGUAGE } from "./labels";

type ListRow = {
  id: string;
  slug: string;
  name: string;
  polity_type: string;
  start_edtf: string | null;
  end_edtf: string | null;
};

const listSelect = sql`
  select n.id, n.slug, pn.name, p.polity_type, sd.edtf as start_edtf, ed.edtf as end_edtf
  from kg.node n
  join history.polity p on p.id = n.id
  join kg.name pn on pn.node_id = n.id and pn.is_primary
  left join kg.fuzzy_date sd on sd.id = p.started_id
  left join kg.fuzzy_date ed on ed.id = p.ended_id
  where n.deleted_at is null`;

const listItem = (r: ListRow) => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  polityType: r.polity_type,
  started: parseDate(r.start_edtf),
  ended: parseDate(r.end_edtf),
});

export async function listPolities(opts: {
  q?: string;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const q = opts.q ? normalizeText(opts.q) : null;
  const filter = sql`${
    q
      ? sql`and exists (select 1 from kg.name x where x.node_id = n.id and x.name_normalized like ${likeContains(q)})`
      : sql``
  } ${opts.type ? sql`and p.polity_type = ${opts.type}` : sql``}`;
  const [rows, [{ count }]] = await Promise.all([
    db.execute<ListRow>(
      sql`${listSelect} ${filter} order by sd.earliest_jdn nulls last, pn.name limit ${limit} offset ${offset}`,
    ),
    db.execute<{ count: number }>(
      sql`select count(*)::int as count from kg.node n join history.polity p on p.id = n.id
          where n.deleted_at is null ${filter}`,
    ),
  ]);
  return { items: rows.map(listItem), total: count };
}

async function resolveId(slugOrId: string): Promise<string> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
  const [row] = await db
    .select({ id: node.id })
    .from(node)
    .where(
      and(
        sql`${node.deletedAt} is null`,
        eq(node.kind, "polity"),
        isUuid ? eq(node.id, slugOrId) : eq(node.slug, slugOrId),
      ),
    );
  if (!row) throw notFound("chính thể");
  return row.id;
}

export async function getPolity(slugOrId: string) {
  const id = await resolveId(slugOrId);
  // Everything below only depends on `id`, not on each other's results, so it is fetched as one
  // batch of round trips in flight at once instead of paying the per-round-trip network cost
  // seven times over, sequentially, for what is otherwise sub-millisecond work on the DB side.
  const [[base], meta, names, attributes, [bodyRow], relations, tenures] = await Promise.all([
    db.execute<ListRow>(sql`${listSelect} and n.id = ${id}`),
    db
      .select({ summary: polity.summary })
      .from(polity)
      .where(eq(polity.id, id))
      .then(([row]) => row!),
    db.execute<{
      name: string;
      kind: string;
      language: string | null;
      script: string | null;
      is_primary: boolean;
    }>(
      sql`select name, kind, language, script, is_primary from kg.name where node_id = ${id} order by is_primary desc, name`,
    ),
    db.execute<{ type: string; label: string | null; value: string }>(
      sql`select a.type, l.text as label, a.value
          from kg.attribute a
          left join kg.label l on l.namespace = 'attribute_type' and l.code = a.type and l.language = ${LABEL_LANGUAGE}
          where a.node_id = ${id} order by a.sort_order`,
    ),
    db.select({ body: node.body }).from(node).where(eq(node.id, id)),
    getNodeRelations(id),
    db.execute<{
      id: string;
      person_id: string;
      person_slug: string;
      person_name: string;
      office_type: string;
      succession_mode: string | null;
      start_edtf: string | null;
      end_edtf: string | null;
      seq: number | null;
      disputed: boolean;
      eras: { name: string }[] | null;
    }>(
      sql`select t.id, t.person_id, pn.slug as person_slug, pm.name as person_name, t.office_type,
                 t.succession_mode, sd.edtf as start_edtf, ed.edtf as end_edtf, t.seq, t.disputed,
                 (select json_agg(json_build_object('name', e.name) order by e.name)
                    from history.tenure_era e where e.tenure_id = t.id) as eras
          from history.tenure t
          join kg.node pn on pn.id = t.person_id and pn.deleted_at is null
          join kg.name pm on pm.node_id = t.person_id and pm.is_primary
          left join kg.fuzzy_date sd on sd.id = t.start_id
          left join kg.fuzzy_date ed on ed.id = t.end_id
          where t.polity_id = ${id}
          order by t.seq nulls last, sd.earliest_jdn nulls last`,
    ),
  ]);
  return {
    ...listItem(base!),
    summary: meta.summary,
    body: bodyRow?.body ?? null,
    attributes: attributes.map((a) => ({ type: a.type, label: a.label ?? a.type, value: a.value })),
    relations,
    names: names.map((n) => ({
      name: n.name,
      kind: n.kind,
      language: n.language,
      script: n.script,
      isPrimary: n.is_primary,
    })),
    tenures: tenures.map((t) => ({
      id: t.id,
      person: { id: t.person_id, slug: t.person_slug, name: t.person_name },
      officeType: t.office_type,
      successionMode: t.succession_mode,
      start: parseDate(t.start_edtf),
      end: parseDate(t.end_edtf),
      seq: t.seq,
      disputed: t.disputed,
      eras: (t.eras ?? []).map((e) => e.name),
    })),
  };
}

export async function getPolityForEdit(slugOrId: string) {
  const d = await getPolity(slugOrId);
  return {
    id: d.id,
    slug: d.slug,
    names: d.names,
    polityType: d.polityType,
    summary: d.summary,
    body: d.body,
    attributes: d.attributes.map((a) => ({ type: a.type, value: a.value })),
    started: d.started,
    ended: d.ended,
  };
}

export async function createPolity(input: PolityInput) {
  // One statement after one slug lookup, like createPerson.
  const id = randomUUID();
  const slug = await uniqueSlug(input.names);
  const started = dateInsert(input.started);
  const ended = dateInsert(input.ended);
  await db.execute(sql`
    with created as (
      insert into kg.node (id, kind, slug, body, review_state)
      values (${id}::uuid, 'polity', ${slug}, ${input.body}, 'approved') returning id)
    ${started.insert ? sql`, started_date as (${started.insert})` : sql``}
    ${ended.insert ? sql`, ended_date as (${ended.insert})` : sql``},
    polity_row as (
      insert into history.polity (id, polity_type, summary, started_id, ended_id)
      select id, ${input.polityType}, ${input.summary}, ${started.id}::uuid, ${ended.id}::uuid
      from created),
    ${sql.join(nameAttributeCtes(id, input.names, input.attributes, "created"), sql`, `)}
    select id from created`);
  return { id, slug };
}

export async function updatePolity(id: string, input: PolityInput) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("chính thể");
  // One statement. The new dates are only inserted when this is a live polity, and the old ones
  // are removed in the same statement.
  const live = sql`exists (
    select 1 from kg.node n join history.polity p on p.id = n.id
    where n.id = ${id}::uuid and n.deleted_at is null)`;
  const started = dateInsert(input.started, live);
  const ended = dateInsert(input.ended, live);
  const [result] = await db.execute<{ updated: number }>(sql`
    with old as (select started_id, ended_id from history.polity where id = ${id}::uuid)
    ${started.insert ? sql`, started_date as (${started.insert})` : sql``}
    ${ended.insert ? sql`, ended_date as (${ended.insert})` : sql``},
    upd as (
      update history.polity set polity_type = ${input.polityType}, summary = ${input.summary},
        started_id = ${started.id}::uuid, ended_id = ${ended.id}::uuid
      where id = ${id}::uuid and ${live} returning id),
    node_upd as (
      update kg.node set updated_at = now()${input.body !== undefined ? sql`, body = ${input.body}` : sql``}
      where id in (select id from upd)),
    ${sql.join(nameAttributeCtes(id, input.names, input.attributes, "upd"), sql`, `)},
    gone_dates as (
      delete from kg.fuzzy_date
      where id in (select started_id from old union select ended_id from old)
        and exists (select 1 from upd))
    select count(*)::int as updated from upd`);
  if (!result?.updated) throw notFound("chính thể");
}

export async function deletePolity(id: string) {
  await softDeleteNode(id, "polity");
}
