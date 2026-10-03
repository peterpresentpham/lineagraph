import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { notFound } from "../errors";
import { polity } from "../schema/history";
import { node } from "../schema/kg";
import type { PolityInput } from "../validation";
import { deleteDates, insertDate, parseDate } from "./dates";
import { createNode, replaceNames, setAttributes, softDeleteNode } from "./node";
import { getNodeRelations } from "./relationships";
import { normalizeText } from "./text";

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

export async function listPolities(opts: { q?: string }) {
  const q = opts.q ? normalizeText(opts.q) : null;
  const filter = q
    ? sql`and exists (select 1 from kg.name x where x.node_id = n.id and x.name_normalized like ${"%" + q + "%"})`
    : sql``;
  const rows = await db.execute<ListRow>(
    sql`${listSelect} ${filter} order by sd.earliest_jdn nulls last, pn.name`,
  );
  return rows.map(listItem);
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
  const [base] = await db.execute<ListRow>(sql`${listSelect} and n.id = ${id}`);
  const [meta] = await db.select({ summary: polity.summary }).from(polity).where(eq(polity.id, id));
  const names = await db.execute<{
    name: string;
    kind: string;
    language: string | null;
    is_primary: boolean;
  }>(
    sql`select name, kind, language, is_primary from kg.name where node_id = ${id} order by is_primary desc, name`,
  );
  const attributes = await db.execute<{ type: string; label: string | null; value: string }>(
    sql`select a.type, l.text as label, a.value
        from kg.attribute a
        left join kg.label l on l.namespace = 'attribute_type' and l.code = a.type and l.language = 'vi'
        where a.node_id = ${id} order by a.sort_order`,
  );
  const [bodyRow] = await db.select({ body: node.body }).from(node).where(eq(node.id, id));
  const relations = await getNodeRelations(id);
  const tenures = await db.execute<{
    id: string;
    person_id: string;
    person_slug: string;
    person_name: string;
    office_type: string;
    succession_mode: string | null;
    start_edtf: string | null;
    end_edtf: string | null;
    seq: number | null;
    eras: { name: string }[] | null;
  }>(
    sql`select t.id, t.person_id, pn.slug as person_slug, pm.name as person_name, t.office_type,
               t.succession_mode, sd.edtf as start_edtf, ed.edtf as end_edtf, t.seq,
               (select json_agg(json_build_object('name', e.name) order by e.name)
                  from history.tenure_era e where e.tenure_id = t.id) as eras
        from history.tenure t
        join kg.node pn on pn.id = t.person_id and pn.deleted_at is null
        join kg.name pm on pm.node_id = t.person_id and pm.is_primary
        left join kg.fuzzy_date sd on sd.id = t.start_id
        left join kg.fuzzy_date ed on ed.id = t.end_id
        where t.polity_id = ${id}
        order by t.seq nulls last, sd.earliest_jdn nulls last`,
  );
  return {
    ...listItem(base!),
    summary: meta!.summary,
    body: bodyRow?.body ?? null,
    attributes: attributes.map((a) => ({ type: a.type, label: a.label ?? a.type, value: a.value })),
    relations,
    names: names.map((n) => ({
      name: n.name,
      kind: n.kind,
      language: n.language,
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
  return db.transaction(async (tx) => {
    const created = await createNode(tx, "polity", input.names, input.body);
    await setAttributes(tx, created.id, input.attributes);
    await tx.insert(polity).values({
      id: created.id,
      polityType: input.polityType,
      summary: input.summary,
      startedId: await insertDate(tx, input.started),
      endedId: await insertDate(tx, input.ended),
    });
    return created;
  });
}

export async function updatePolity(id: string, input: PolityInput) {
  await resolveId(id);
  await db.transaction(async (tx) => {
    const [old] = await tx
      .select({ s: polity.startedId, e: polity.endedId })
      .from(polity)
      .where(eq(polity.id, id));
    await tx
      .update(polity)
      .set({
        polityType: input.polityType,
        summary: input.summary,
        startedId: await insertDate(tx, input.started),
        endedId: await insertDate(tx, input.ended),
      })
      .where(eq(polity.id, id));
    await deleteDates(tx, [old?.s ?? null, old?.e ?? null]);
    await replaceNames(tx, id, input.names, input.body);
    await setAttributes(tx, id, input.attributes);
  });
}

export async function deletePolity(id: string) {
  await resolveId(id);
  await db.transaction((tx) => softDeleteNode(tx, id));
}
