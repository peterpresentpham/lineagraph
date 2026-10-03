import { eq, or, sql } from "drizzle-orm";
import { db } from "../db";
import { notFound } from "../errors";
import { tenure, tenureEra, tenureSuccession } from "../schema/history";
import type { Tx } from "../db";
import type { TenureInput } from "../validation";
import { deleteDates, insertDate, parseDate } from "./dates";

export async function listTenures(opts: { personId?: string; polityId?: string }) {
  const where = opts.personId
    ? sql`t.person_id = ${opts.personId}`
    : opts.polityId
      ? sql`t.polity_id = ${opts.polityId}`
      : sql`true`;
  const rows = await db.execute<{
    id: string; person_id: string; person_name: string; polity_id: string | null; polity_name: string | null;
    office_type: string; start_edtf: string | null; end_edtf: string | null; seq: number | null;
  }>(
    sql`select t.id, t.person_id, pm.name as person_name, t.polity_id, qm.name as polity_name, t.office_type,
               sd.edtf as start_edtf, ed.edtf as end_edtf, t.seq
        from history.tenure t
        join kg.node pn on pn.id = t.person_id and pn.deleted_at is null
        join kg.name pm on pm.node_id = t.person_id and pm.is_primary
        left join kg.name qm on qm.node_id = t.polity_id and qm.is_primary
        left join kg.fuzzy_date sd on sd.id = t.start_id
        left join kg.fuzzy_date ed on ed.id = t.end_id
        where ${where}
        order by pm.name_normalized, sd.earliest_jdn nulls last
        limit 500`,
  );
  return rows.map((r) => ({
    id: r.id,
    person: { id: r.person_id, name: r.person_name },
    polity: r.polity_id ? { id: r.polity_id, name: r.polity_name } : null,
    officeType: r.office_type,
    start: parseDate(r.start_edtf),
    end: parseDate(r.end_edtf),
    seq: r.seq,
  }));
}

export async function getTenureForEdit(id: string) {
  const [row] = await db.execute<{
    id: string; person_id: string; polity_id: string | null; office_type: string;
    succession_mode: string | null; seq: number | null; start_edtf: string | null; end_edtf: string | null;
  }>(
    sql`select t.id, t.person_id, t.polity_id, t.office_type, t.succession_mode, t.seq,
               sd.edtf as start_edtf, ed.edtf as end_edtf
        from history.tenure t
        left join kg.fuzzy_date sd on sd.id = t.start_id
        left join kg.fuzzy_date ed on ed.id = t.end_id
        where t.id = ${id}`,
  );
  if (!row) throw notFound("nhiệm kỳ");
  const eras = await db.execute<{ name: string; start_edtf: string | null; end_edtf: string | null }>(
    sql`select e.name, sd.edtf as start_edtf, ed.edtf as end_edtf
        from history.tenure_era e
        left join kg.fuzzy_date sd on sd.id = e.start_id
        left join kg.fuzzy_date ed on ed.id = e.end_id
        where e.tenure_id = ${id} order by sd.earliest_jdn nulls last`,
  );
  return {
    id: row.id,
    personId: row.person_id,
    polityId: row.polity_id,
    officeType: row.office_type,
    successionMode: row.succession_mode,
    seq: row.seq,
    start: parseDate(row.start_edtf),
    end: parseDate(row.end_edtf),
    eras: eras.map((e) => ({ name: e.name, start: parseDate(e.start_edtf), end: parseDate(e.end_edtf) })),
  };
}

async function writeEras(tx: Tx, tenureId: string, eras: TenureInput["eras"]) {
  for (const era of eras) {
    await tx.insert(tenureEra).values({
      tenureId,
      name: era.name,
      startId: await insertDate(tx, era.start),
      endId: await insertDate(tx, era.end),
    });
  }
}

async function removeEras(tx: Tx, tenureId: string) {
  const old = await tx.select().from(tenureEra).where(eq(tenureEra.tenureId, tenureId));
  await tx.delete(tenureEra).where(eq(tenureEra.tenureId, tenureId));
  await deleteDates(tx, old.flatMap((e) => [e.startId, e.endId]));
}

export async function createTenure(input: TenureInput) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(tenure)
      .values({
        personId: input.personId,
        polityId: input.polityId ?? null,
        officeType: input.officeType,
        successionMode: input.successionMode,
        seq: input.seq ?? null,
        startId: await insertDate(tx, input.start),
        endId: await insertDate(tx, input.end),
      })
      .returning({ id: tenure.id });
    await writeEras(tx, row!.id, input.eras);
    return row!;
  });
}

export async function updateTenure(id: string, input: TenureInput) {
  await getTenureForEdit(id);
  await db.transaction(async (tx) => {
    const [old] = await tx.select().from(tenure).where(eq(tenure.id, id));
    await tx
      .update(tenure)
      .set({
        personId: input.personId,
        polityId: input.polityId ?? null,
        officeType: input.officeType,
        successionMode: input.successionMode,
        seq: input.seq ?? null,
        startId: await insertDate(tx, input.start),
        endId: await insertDate(tx, input.end),
      })
      .where(eq(tenure.id, id));
    await deleteDates(tx, [old!.startId, old!.endId]);
    await removeEras(tx, id);
    await writeEras(tx, id, input.eras);
  });
}

export async function deleteTenure(id: string) {
  await getTenureForEdit(id);
  await db.transaction(async (tx) => {
    const [old] = await tx.select().from(tenure).where(eq(tenure.id, id));
    await tx
      .delete(tenureSuccession)
      .where(or(eq(tenureSuccession.fromTenureId, id), eq(tenureSuccession.toTenureId, id)));
    await removeEras(tx, id);
    await tx.delete(tenure).where(eq(tenure.id, id));
    await deleteDates(tx, [old!.startId, old!.endId]);
  });
}

