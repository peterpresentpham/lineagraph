import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { notFound } from "../errors";
import { node } from "../schema/kg";
import type { PersonInput } from "../validation";
import { dateInsert, parseDate, toRow } from "./dates";
import { nameAttributeCtes, softDeleteNode, uniqueSlug, withoutSource } from "./node";
import { getNodeRelations } from "./relationships";
import { likeContains, normalizeText } from "./text";
import { LABEL_LANGUAGE } from "./labels";

export type PersonSummary = {
  id: string;
  slug: string;
  name: string;
  sex: string;
  historicity: string;
  birth: ReturnType<typeof parseDate>;
  death: ReturnType<typeof parseDate>;
  /** When the record last changed (ISO), for the sitemap. */
  updatedAt: string;
};

type SummaryRow = {
  id: string;
  slug: string;
  name: string;
  sex: string;
  historicity: string;
  birth_edtf: string | null;
  death_edtf: string | null;
  updated_at: Date | string;
};

const summaryFrom = (r: SummaryRow): PersonSummary => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  sex: r.sex,
  historicity: r.historicity,
  birth: parseDate(r.birth_edtf),
  death: parseDate(r.death_edtf),
  updatedAt: new Date(r.updated_at).toISOString(),
});

// Base query for person lists: one row per person with primary name and preferred dates.
const summarySelect = sql`
  select n.id, n.slug, pn.name, p.sex, p.historicity,
         bd.edtf as birth_edtf, dd.edtf as death_edtf, n.updated_at
  from kg.node n
  join history.person p on p.id = n.id
  join kg.name pn on pn.node_id = n.id and pn.is_primary
  left join history.person_date b on b.person_id = p.id and b.kind = 'birth' and b.is_preferred
  left join kg.fuzzy_date bd on bd.id = b.date_id
  left join history.person_date d on d.person_id = p.id and d.kind = 'death' and d.is_preferred
  left join kg.fuzzy_date dd on dd.id = d.date_id
  where n.deleted_at is null`;

export async function listPersons(opts: {
  q?: string;
  sex?: string;
  historicity?: string;
  /** Only people that have no source at all. */
  noSource?: boolean;
  sort?: "name" | "birth" | "notable";
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
  } ${opts.sex ? sql`and p.sex = ${opts.sex}` : sql``} ${
    opts.historicity ? sql`and p.historicity = ${opts.historicity}` : sql``
  } ${opts.noSource ? withoutSource : sql``}`;
  // "Notable" favours people who held office or are well connected and cited, so a home page
  // does not open on whoever sorts first alphabetically.
  const notability = sql`(
    (select count(*) from kg.relation r where r.from_id = n.id or r.to_id = n.id)
    + 3 * (select count(*) from history.tenure t where t.person_id = n.id)
    + 2 * (select count(*) from kg.citation c where c.subject_id = n.id)
  ) desc, pn.name_normalized`;
  const order =
    opts.sort === "birth"
      ? sql`bd.earliest_jdn nulls last, pn.name_normalized`
      : opts.sort === "notable"
        ? notability
        : sql`pn.name_normalized`;
  const [rows, [{ count }]] = await Promise.all([
    db.execute<SummaryRow>(
      sql`${summarySelect} ${filter} order by ${order} limit ${limit} offset ${offset}`,
    ),
    db.execute<{ count: number }>(
      sql`select count(*)::int as count from kg.node n join history.person p on p.id = n.id
          where n.deleted_at is null ${filter}`,
    ),
  ]);
  return { items: rows.map(summaryFrom), total: count };
}

export async function getPersonSummaries(ids: string[]) {
  if (!ids.length) return [];
  const rows = await db.execute<SummaryRow>(
    sql`${summarySelect} and n.id in (${sql.join(
      ids.map((id) => sql`${id}::uuid`),
      sql`, `,
    )})`,
  );
  return rows.map(summaryFrom);
}

async function resolveId(slugOrId: string): Promise<string> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
  const [row] = await db
    .select({ id: node.id })
    .from(node)
    .where(
      and(
        sql`${node.deletedAt} is null`,
        eq(node.kind, "person"),
        isUuid ? eq(node.id, slugOrId) : eq(node.slug, slugOrId),
      ),
    );
  if (!row) throw notFound("nhân vật");
  return row.id;
}

export async function getPerson(slugOrId: string) {
  const id = await resolveId(slugOrId);
  // Everything below only depends on `id`, not on each other's results, so it is fetched as one
  // batch of round trips in flight at once instead of paying the per-round-trip network cost
  // nine times over, sequentially, for what is otherwise sub-millisecond work on the DB side.
  const [[base], meta, names, attributes, [bodyRow], relations, siblingIds, tenureRows] =
    await Promise.all([
      getPersonSummaries([id]),
      db
        .execute<{
          sex: string;
          historicity: string;
          summary: string | null;
          birth_place_id: string | null;
          birth_place_name: string | null;
          death_place_id: string | null;
          death_place_name: string | null;
        }>(
          sql`select p.sex, p.historicity, p.summary, p.birth_place_id, bp.name as birth_place_name,
                     p.death_place_id, dp.name as death_place_name
              from history.person p
              left join history.place bp on bp.id = p.birth_place_id
              left join history.place dp on dp.id = p.death_place_id
              where p.id = ${id}`,
        )
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
      // Siblings are derived: anyone who shares a parent.
      db.execute<{ id: string }>(
        sql`select distinct r2.to_id as id
            from kg.relation r1 join kg.relation r2 on r2.from_id = r1.from_id and r2.type = 'parent_of'
            where r1.type = 'parent_of' and r1.to_id = ${id} and r2.to_id <> ${id}`,
      ),
      db.execute<{
        id: string;
        polity_id: string | null;
        polity_slug: string | null;
        polity_name: string | null;
        office_type: string;
        start_edtf: string | null;
        end_edtf: string | null;
        seq: number | null;
        disputed: boolean;
        state: string;
      }>(
        sql`select t.id, t.polity_id, pn.slug as polity_slug, pm.name as polity_name, t.office_type,
                   sd.edtf as start_edtf, ed.edtf as end_edtf, t.seq, t.disputed, t.state
            from history.tenure t
            left join kg.node pn on pn.id = t.polity_id and pn.deleted_at is null
            left join kg.name pm on pm.node_id = pn.id and pm.is_primary
            left join kg.fuzzy_date sd on sd.id = t.start_id
            left join kg.fuzzy_date ed on ed.id = t.end_id
            where t.person_id = ${id}
            order by sd.earliest_jdn nulls last`,
      ),
    ]);
  // Depends on siblingIds above, so it is the one round trip that cannot join that batch.
  const siblings = await getPersonSummaries(siblingIds.map((r) => r.id));

  return {
    ...base!,
    sex: meta.sex,
    historicity: meta.historicity,
    summary: meta.summary,
    birthPlace: meta.birth_place_id
      ? { id: meta.birth_place_id, name: meta.birth_place_name! }
      : null,
    deathPlace: meta.death_place_id
      ? { id: meta.death_place_id, name: meta.death_place_name! }
      : null,
    names: names.map((n) => ({
      name: n.name,
      kind: n.kind,
      language: n.language,
      script: n.script,
      isPrimary: n.is_primary,
    })),
    body: bodyRow?.body ?? null,
    attributes: attributes.map((a) => ({ type: a.type, label: a.label ?? a.type, value: a.value })),
    relations,
    siblings,
    tenures: tenureRows.map((t) => ({
      id: t.id,
      polity:
        t.polity_id && t.polity_name
          ? { id: t.polity_id, slug: t.polity_slug, name: t.polity_name }
          : null,
      officeType: t.office_type,
      start: parseDate(t.start_edtf),
      end: parseDate(t.end_edtf),
      disputed: t.disputed,
      state: t.state,
    })),
  };
}

// Form-shaped data for editing (dates as parts, ids instead of nested objects).
export async function getPersonForEdit(slugOrId: string) {
  const detail = await getPerson(slugOrId);
  return {
    id: detail.id,
    slug: detail.slug,
    names: detail.names,
    sex: detail.sex,
    historicity: detail.historicity,
    summary: detail.summary,
    body: detail.body,
    attributes: detail.attributes.map((a) => ({ type: a.type, value: a.value })),
    birth: detail.birth,
    death: detail.death,
    birthPlaceId: detail.birthPlace?.id ?? null,
    deathPlaceId: detail.deathPlace?.id ?? null,
    birthPlaceName: detail.birthPlace?.name ?? null,
    deathPlaceName: detail.deathPlace?.name ?? null,
  };
}

export async function createPerson(input: PersonInput) {
  // One statement (node, person, names, attributes, dates) after one slug lookup; each insert
  // selects `from created`, so the rows can reference the node inserted in the same statement.
  const id = randomUUID();
  const slug = await uniqueSlug(input.names);
  const dates = (["birth", "death"] as const).flatMap((kind) => {
    const date = dateInsert(input[kind]);
    if (!date.insert) return [];
    return [
      sql`${sql.raw(kind)}_date as (${date.insert})`,
      sql`${sql.raw(kind)}_link as (
        insert into history.person_date (person_id, kind, date_id, is_preferred)
        select id, ${kind}, ${date.id}::uuid, true from created)`,
    ];
  });
  await db.execute(sql`
    with created as (
      insert into kg.node (id, kind, slug, body, review_state)
      values (${id}::uuid, 'person', ${slug}, ${input.body}, 'approved') returning id),
    person_row as (
      insert into history.person (id, sex, historicity, summary, birth_place_id, death_place_id)
      select id, ${input.sex}, ${input.historicity}, ${input.summary},
             ${input.birthPlaceId ?? null}::uuid, ${input.deathPlaceId ?? null}::uuid from created),
    ${sql.join([...nameAttributeCtes(id, input.names, input.attributes, "created"), ...dates], sql`, `)}
    select id from created`);
  return { id, slug };
}

// SQL for one date kind (birth/death) of an update, as CTEs of the single statement below.
// The preferred row's fuzzy_date is updated in place (a delete + insert in one statement could
// trip the unique "one preferred date per kind" index); a missing one is inserted; a cleared
// one is deleted together with any stale non-preferred rows.
function dateCtes(personId: string, kind: "birth" | "death", value: PersonInput["birth"]) {
  const preferred = sql`select date_id from history.person_date
    where person_id = ${personId}::uuid and kind = ${kind} and is_preferred`;
  if (!value) {
    return sql`,
      ${sql.raw(kind)}_pd_del as (
        delete from history.person_date
        where person_id = ${personId}::uuid and kind = ${kind} returning date_id),
      ${sql.raw(kind)}_fd_del as (
        delete from kg.fuzzy_date where id in (select date_id from ${sql.raw(kind)}_pd_del))`;
  }
  const row = toRow(value);
  const newId = randomUUID();
  return sql`,
    ${sql.raw(kind)}_fd_upd as (
      update kg.fuzzy_date set edtf = ${row.edtf}, precision = ${row.precision},
        earliest_jdn = ${row.earliestJdn}, latest_jdn = ${row.latestJdn},
        source_calendar = ${row.sourceCalendar}
      where id in (${preferred})),
    ${sql.raw(kind)}_fd_ins as (
      insert into kg.fuzzy_date (id, edtf, precision, earliest_jdn, latest_jdn, source_calendar)
      select ${newId}::uuid, ${row.edtf}, ${row.precision}, ${row.earliestJdn}, ${row.latestJdn},
        ${row.sourceCalendar}
      from upd where not exists (${preferred}) returning id),
    ${sql.raw(kind)}_pd_ins as (
      insert into history.person_date (person_id, kind, date_id, is_preferred)
      select ${personId}::uuid, ${kind}, id, true from ${sql.raw(kind)}_fd_ins),
    ${sql.raw(kind)}_pd_del as (
      delete from history.person_date
      where person_id = ${personId}::uuid and kind = ${kind} and not is_preferred
      returning date_id),
    ${sql.raw(kind)}_fd_del as (
      delete from kg.fuzzy_date where id in (select date_id from ${sql.raw(kind)}_pd_del))`;
}

export async function updatePerson(id: string, input: PersonInput) {
  // The DB is a network hop away and every statement costs a full round trip, so the whole
  // update (person row, names, attributes, both dates) is ONE statement of data-modifying CTEs:
  // one round trip and atomic without an explicit transaction. Inserts select `from upd`, so a
  // missing/deleted person inserts nothing and is reported as not found.
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("nhân vật");
  const [result] = await db.execute<{ updated: number }>(sql`
    with upd as (
      update history.person set sex = ${input.sex}, historicity = ${input.historicity},
        summary = ${input.summary}, birth_place_id = ${input.birthPlaceId ?? null}::uuid,
        death_place_id = ${input.deathPlaceId ?? null}::uuid
      where id = ${id}::uuid
        and exists (select 1 from kg.node where id = ${id}::uuid and deleted_at is null)
      returning id),
    node_upd as (
      update kg.node set updated_at = now()${input.body !== undefined ? sql`, body = ${input.body}` : sql``}
      where id in (select id from upd)),
    ${sql.join(nameAttributeCtes(id, input.names, input.attributes, "upd"), sql`, `)}
    ${dateCtes(id, "birth", input.birth)}
    ${dateCtes(id, "death", input.death)}
    select count(*)::int as updated from upd`);
  if (!result?.updated) throw notFound("nhân vật");
}

export async function deletePerson(id: string) {
  await softDeleteNode(id, "person");
}
