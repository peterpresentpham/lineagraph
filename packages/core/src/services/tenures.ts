import { randomUUID } from "node:crypto";
import { sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { ServiceError, notFound } from "../errors";
import type { TenureInput } from "../validation";
import { dateInsert, parseDate } from "./dates";

export async function listTenures(opts: { personId?: string; polityId?: string }) {
  const where = opts.personId
    ? sql`t.person_id = ${opts.personId}`
    : opts.polityId
      ? sql`t.polity_id = ${opts.polityId}`
      : sql`true`;
  const rows = await db.execute<{
    id: string;
    person_id: string;
    person_name: string;
    polity_id: string | null;
    polity_name: string | null;
    office_type: string;
    start_edtf: string | null;
    end_edtf: string | null;
    seq: number | null;
    disputed: boolean;
  }>(
    sql`select t.id, t.person_id, pm.name as person_name, t.polity_id, qm.name as polity_name, t.office_type,
               sd.edtf as start_edtf, ed.edtf as end_edtf, t.seq, t.disputed
        from history.tenure t
        join kg.node pn on pn.id = t.person_id and pn.deleted_at is null
        join kg.name pm on pm.node_id = t.person_id and pm.is_primary
        left join kg.node qn on qn.id = t.polity_id and qn.deleted_at is null
        left join kg.name qm on qm.node_id = qn.id and qm.is_primary
        left join kg.fuzzy_date sd on sd.id = t.start_id
        left join kg.fuzzy_date ed on ed.id = t.end_id
        where ${where}
        order by pm.name_normalized, sd.earliest_jdn nulls last
        limit 500`,
  );
  return rows.map((r) => ({
    id: r.id,
    person: { id: r.person_id, name: r.person_name },
    polity: r.polity_id && r.polity_name ? { id: r.polity_id, name: r.polity_name } : null,
    officeType: r.office_type,
    start: parseDate(r.start_edtf),
    end: parseDate(r.end_edtf),
    seq: r.seq,
    disputed: r.disputed,
  }));
}

export async function getTenureForEdit(id: string) {
  const [row] = await db.execute<{
    id: string;
    person_id: string;
    polity_id: string | null;
    office_type: string;
    succession_mode: string | null;
    seq: number | null;
    disputed: boolean;
    start_edtf: string | null;
    end_edtf: string | null;
  }>(
    sql`select t.id, t.person_id, t.polity_id, t.office_type, t.succession_mode, t.seq, t.disputed,
               sd.edtf as start_edtf, ed.edtf as end_edtf
        from history.tenure t
        left join kg.fuzzy_date sd on sd.id = t.start_id
        left join kg.fuzzy_date ed on ed.id = t.end_id
        where t.id = ${id}`,
  );
  if (!row) throw notFound("nhiệm kỳ");
  const eras = await db.execute<{
    name: string;
    start_edtf: string | null;
    end_edtf: string | null;
  }>(
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
    disputed: row.disputed,
    start: parseDate(row.start_edtf),
    end: parseDate(row.end_edtf),
    eras: eras.map((e) => ({
      name: e.name,
      start: parseDate(e.start_edtf),
      end: parseDate(e.end_edtf),
    })),
  };
}

// A tenure with its dates and eras is several tables; each write below is ONE statement of
// data-modifying CTEs (atomic, one network round trip) instead of a dozen sequential queries.

// Checks the references in one query, with friendlier messages than a foreign-key conflict.
async function assertTenureRefs(input: TenureInput) {
  const [ok] = await db.execute<{
    person: boolean;
    polity: boolean;
    office: boolean;
    mode: boolean;
  }>(
    sql`select
          exists (select 1 from kg.node where id = ${input.personId}::uuid and kind = 'person' and deleted_at is null) as person,
          (${input.polityId ?? null}::uuid is null
            or exists (select 1 from kg.node where id = ${input.polityId ?? null}::uuid and kind = 'polity' and deleted_at is null)) as polity,
          exists (select 1 from history.office_type where code = ${input.officeType}) as office,
          (${input.successionMode}::text is null
            or exists (select 1 from history.succession_mode where code = ${input.successionMode})) as mode`,
  );
  if (!ok?.person) throw new ServiceError(400, "Nhân vật không tồn tại hoặc đã bị xoá");
  if (!ok.polity) throw new ServiceError(400, "Chính thể không tồn tại hoặc đã bị xoá");
  if (!ok.office) throw new ServiceError(400, "Chức vụ không hợp lệ");
  if (!ok.mode) throw new ServiceError(400, "Kiểu kế vị không hợp lệ");
}

// The date and era CTEs for a tenure, plus the ids the tenure row must point at.
function tenureParts(tenureId: string, input: TenureInput, guard: SQL) {
  const start = dateInsert(input.start, guard);
  const end = dateInsert(input.end, guard);
  const ctes: SQL[] = [];
  if (start.insert) ctes.push(sql`start_date as (${start.insert})`);
  if (end.insert) ctes.push(sql`end_date as (${end.insert})`);
  input.eras.forEach((era, i) => {
    const es = dateInsert(era.start, guard);
    const ee = dateInsert(era.end, guard);
    if (es.insert) ctes.push(sql`era${sql.raw(String(i))}_start as (${es.insert})`);
    if (ee.insert) ctes.push(sql`era${sql.raw(String(i))}_end as (${ee.insert})`);
    ctes.push(sql`era${sql.raw(String(i))} as (
      insert into history.tenure_era (tenure_id, name, start_id, end_id)
      select ${tenureId}::uuid, ${era.name}, ${es.id}::uuid, ${ee.id}::uuid where ${guard})`);
  });
  return { ctes, startId: start.id, endId: end.id };
}

export async function createTenure(input: TenureInput) {
  await assertTenureRefs(input);
  const id = randomUUID();
  const { ctes, startId, endId } = tenureParts(id, input, sql`true`);
  const [row] = await db.execute<{ id: string }>(sql`
    with created as (
      insert into history.tenure (id, person_id, polity_id, office_type, succession_mode, seq,
                                  disputed, start_id, end_id)
      values (${id}::uuid, ${input.personId}::uuid, ${input.polityId ?? null}::uuid,
              ${input.officeType}, ${input.successionMode}, ${input.seq ?? null}, ${input.disputed},
              ${startId}::uuid, ${endId}::uuid)
      returning id)
    ${ctes.length ? sql`, ${sql.join(ctes, sql`, `)}` : sql``}
    select id from created`);
  return row!;
}

export async function updateTenure(id: string, input: TenureInput) {
  await assertTenureRefs(input);
  const exists = sql`exists (select 1 from old)`;
  const { ctes, startId, endId } = tenureParts(id, input, exists);
  const [result] = await db.execute<{ updated: number }>(sql`
    with old as (select start_id, end_id from history.tenure where id = ${id}::uuid),
    old_eras as (select start_id, end_id from history.tenure_era where tenure_id = ${id}::uuid),
    gone_eras as (delete from history.tenure_era where tenure_id = ${id}::uuid)
    ${ctes.length ? sql`, ${sql.join(ctes, sql`, `)}` : sql``},
    upd as (
      update history.tenure set person_id = ${input.personId}::uuid,
        polity_id = ${input.polityId ?? null}::uuid, office_type = ${input.officeType},
        succession_mode = ${input.successionMode}, seq = ${input.seq ?? null},
        disputed = ${input.disputed}, start_id = ${startId}::uuid, end_id = ${endId}::uuid
      where id = ${id}::uuid returning id),
    gone_dates as (
      delete from kg.fuzzy_date where id in (
        select start_id from old union select end_id from old
        union select start_id from old_eras union select end_id from old_eras))
    select count(*)::int as updated from upd`);
  if (!result?.updated) throw notFound("nhiệm kỳ");
}

export async function deleteTenure(id: string) {
  const [result] = await db.execute<{ deleted: number }>(sql`
    with old as (select start_id, end_id from history.tenure where id = ${id}::uuid),
    old_eras as (select start_id, end_id from history.tenure_era where tenure_id = ${id}::uuid),
    gone_links as (
      delete from history.tenure_succession
      where from_tenure_id = ${id}::uuid or to_tenure_id = ${id}::uuid),
    gone_eras as (delete from history.tenure_era where tenure_id = ${id}::uuid),
    gone_citations as (
      delete from kg.citation where subject_table = 'tenure' and subject_id = ${id}::uuid),
    gone as (delete from history.tenure where id = ${id}::uuid returning id),
    gone_dates as (
      delete from kg.fuzzy_date where id in (
        select start_id from old union select end_id from old
        union select start_id from old_eras union select end_id from old_eras))
    select count(*)::int as deleted from gone`);
  if (!result?.deleted) throw notFound("nhiệm kỳ");
}
