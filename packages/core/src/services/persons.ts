import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { notFound } from "../errors";
import { personDate, person } from "../schema/history";
import { node } from "../schema/kg";
import type { PersonInput } from "../validation";
import { deleteDates, insertDate, parseDate, toRow } from "./dates";
import { createNode, setAttributes, softDeleteNode } from "./node";
import { getNodeRelations } from "./relationships";
import { normalizeText } from "./text";
import type { Tx } from "../db";

export type PersonSummary = {
  id: string;
  slug: string;
  name: string;
  sex: string;
  historicity: string;
  birth: ReturnType<typeof parseDate>;
  death: ReturnType<typeof parseDate>;
};

type SummaryRow = {
  id: string;
  slug: string;
  name: string;
  sex: string;
  historicity: string;
  birth_edtf: string | null;
  death_edtf: string | null;
};

const summaryFrom = (r: SummaryRow): PersonSummary => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  sex: r.sex,
  historicity: r.historicity,
  birth: parseDate(r.birth_edtf),
  death: parseDate(r.death_edtf),
});

// Base query for person lists: one row per person with primary name and preferred dates.
const summarySelect = sql`
  select n.id, n.slug, pn.name, p.sex, p.historicity,
         bd.edtf as birth_edtf, dd.edtf as death_edtf
  from kg.node n
  join history.person p on p.id = n.id
  join kg.name pn on pn.node_id = n.id and pn.is_primary
  left join history.person_date b on b.person_id = p.id and b.kind = 'birth' and b.is_preferred
  left join kg.fuzzy_date bd on bd.id = b.date_id
  left join history.person_date d on d.person_id = p.id and d.kind = 'death' and d.is_preferred
  left join kg.fuzzy_date dd on dd.id = d.date_id
  where n.deleted_at is null`;

export async function listPersons(opts: { q?: string; limit?: number; offset?: number }) {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;
  const q = opts.q ? normalizeText(opts.q) : null;
  const filter = q
    ? sql`and exists (select 1 from kg.name x where x.node_id = n.id and x.name_normalized like ${"%" + q + "%"})`
    : sql``;
  const [rows, [{ count }]] = await Promise.all([
    db.execute<SummaryRow>(
      sql`${summarySelect} ${filter} order by pn.name_normalized limit ${limit} offset ${offset}`,
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
        .select({ sex: person.sex, historicity: person.historicity, summary: person.summary })
        .from(person)
        .where(eq(person.id, id))
        .then(([row]) => row!),
      db.execute<{
        name: string;
        kind: string;
        language: string | null;
        is_primary: boolean;
      }>(
        sql`select name, kind, language, is_primary from kg.name where node_id = ${id} order by is_primary desc, name`,
      ),
      db.execute<{ type: string; label: string | null; value: string }>(
        sql`select a.type, l.text as label, a.value
            from kg.attribute a
            left join kg.label l on l.namespace = 'attribute_type' and l.code = a.type and l.language = 'vi'
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
      }>(
        sql`select t.id, t.polity_id, pn.slug as polity_slug, pm.name as polity_name, t.office_type,
                   sd.edtf as start_edtf, ed.edtf as end_edtf, t.seq, t.disputed
            from history.tenure t
            left join kg.node pn on pn.id = t.polity_id and pn.deleted_at is null
            left join kg.name pm on pm.node_id = t.polity_id and pm.is_primary
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
    names: names.map((n) => ({
      name: n.name,
      kind: n.kind,
      language: n.language,
      isPrimary: n.is_primary,
    })),
    body: bodyRow?.body ?? null,
    attributes: attributes.map((a) => ({ type: a.type, label: a.label ?? a.type, value: a.value })),
    relations,
    siblings,
    tenures: tenureRows.map((t) => ({
      id: t.id,
      polity: t.polity_id ? { id: t.polity_id, slug: t.polity_slug, name: t.polity_name } : null,
      officeType: t.office_type,
      start: parseDate(t.start_edtf),
      end: parseDate(t.end_edtf),
      disputed: t.disputed,
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
  };
}

async function setPersonDates(tx: Tx, personId: string, input: PersonInput) {
  const old = await tx
    .select({ dateId: personDate.dateId })
    .from(personDate)
    .where(and(eq(personDate.personId, personId), inArray(personDate.kind, ["birth", "death"])));
  await tx
    .delete(personDate)
    .where(and(eq(personDate.personId, personId), inArray(personDate.kind, ["birth", "death"])));
  await deleteDates(
    tx,
    old.map((o) => o.dateId),
  );
  for (const [kind, value] of [
    ["birth", input.birth],
    ["death", input.death],
  ] as const) {
    const dateId = await insertDate(tx, value);
    if (dateId) await tx.insert(personDate).values({ personId, kind, dateId, isPreferred: true });
  }
}

export async function createPerson(input: PersonInput) {
  return db.transaction(async (tx) => {
    const created = await createNode(tx, "person", input.names, input.body);
    await setAttributes(tx, created.id, input.attributes);
    await tx.insert(person).values({
      id: created.id,
      sex: input.sex,
      historicity: input.historicity,
      summary: input.summary,
    });
    await setPersonDates(tx, created.id, input);
    return created;
  });
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
  const names = input.names.map((n) => ({
    name: n.name,
    name_normalized: normalizeText(n.name),
    kind: n.kind,
    language: n.language || null,
    is_primary: n.isPrimary,
  }));
  const attributes = input.attributes.map((a, i) => ({ type: a.type, value: a.value, sort: i }));
  const [result] = await db.execute<{ updated: number }>(sql`
    with upd as (
      update history.person set sex = ${input.sex}, historicity = ${input.historicity},
        summary = ${input.summary}
      where id = ${id}::uuid
        and exists (select 1 from kg.node where id = ${id}::uuid and deleted_at is null)
      returning id),
    node_upd as (
      update kg.node set updated_at = now()${input.body !== undefined ? sql`, body = ${input.body}` : sql``}
      where id in (select id from upd)),
    names_del as (delete from kg.name where node_id = ${id}::uuid),
    names_ins as (
      insert into kg.name (node_id, name, name_normalized, kind, language, is_primary)
      select ${id}::uuid, x.name, x.name_normalized, x.kind, x.language, x.is_primary
      from jsonb_to_recordset(${JSON.stringify(names)}::jsonb) as x(
        name text, name_normalized text, kind text, language text, is_primary boolean),
        upd),
    attr_del as (delete from kg.attribute where node_id = ${id}::uuid),
    attr_ins as (
      insert into kg.attribute (node_id, type, value, sort_order)
      select ${id}::uuid, x.type, x.value, x.sort
      from jsonb_to_recordset(${JSON.stringify(attributes)}::jsonb) as x(
        type text, value text, sort int),
        upd)
    ${dateCtes(id, "birth", input.birth)}
    ${dateCtes(id, "death", input.death)}
    select count(*)::int as updated from upd`);
  if (!result?.updated) throw notFound("nhân vật");
}

export async function deletePerson(id: string) {
  await resolveId(id);
  await db.transaction((tx) => softDeleteNode(tx, id));
}
