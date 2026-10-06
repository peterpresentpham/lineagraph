import { sql } from "drizzle-orm";
import { db } from "../db";
import { ServiceError } from "../errors";
import { LABEL_LANGUAGE } from "./labels";

// Registry (lookup) tables the admin can see; only the ones marked editable can be edited, because
// the others need extra columns.
const tables = {
  name_kind: { schema: "kg", editable: true },
  polity_type: { schema: "history", editable: true },
  office_type: { schema: "history", editable: true },
  succession_mode: { schema: "history", editable: true },
  attribute_type: { schema: "kg", editable: true },
  event_type: { schema: "history", editable: true },
  participant_role: { schema: "history", editable: true },
  relation_type: { schema: "kg", editable: false },
  calendar: { schema: "kg", editable: false },
} as const;

export type RegistryTable = keyof typeof tables;
export const registryTables = Object.keys(tables) as RegistryTable[];

function resolve(table: string) {
  const entry = tables[table as RegistryTable];
  if (!entry) throw new ServiceError(404, "Không tìm thấy danh mục");
  return { name: table, ...entry };
}

export async function listRegistry(table: string) {
  const t = resolve(table);
  const rows = await db.execute<{ code: string; label: string | null }>(
    sql`select r.code, l.text as label
        from ${sql.raw(`${t.schema}.${t.name}`)} r
        left join kg.label l on l.namespace = ${t.name} and l.code = r.code and l.language = ${LABEL_LANGUAGE}
        order by r.code`,
  );
  return rows.map((r) => ({ code: r.code, label: r.label ?? r.code }));
}

export async function createRegistryItem(table: string, input: { code: string; label: string }) {
  const t = resolve(table);
  if (!t.editable) throw new ServiceError(400, "Danh mục này chưa hỗ trợ thêm từ giao diện");
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`insert into ${sql.raw(`${t.schema}.${t.name}`)} (code) values (${input.code})`,
    );
    await tx.execute(
      sql`insert into kg.label (namespace, code, language, text) values (${t.name}, ${input.code}, ${LABEL_LANGUAGE}, ${input.label})`,
    );
  });
}

export async function updateRegistryLabel(table: string, code: string, label: string) {
  const t = resolve(table);
  await db.execute(
    sql`insert into kg.label (namespace, code, language, text) values (${t.name}, ${code}, ${LABEL_LANGUAGE}, ${label})
        on conflict (namespace, code, language) do update set text = excluded.text`,
  );
}

export async function deleteRegistryItem(table: string, code: string) {
  const t = resolve(table);
  if (!t.editable) throw new ServiceError(400, "Danh mục này chưa hỗ trợ xoá từ giao diện");
  await db.transaction(async (tx) => {
    await tx.execute(sql`delete from kg.label where namespace = ${t.name} and code = ${code}`);
    await tx.execute(sql`delete from ${sql.raw(`${t.schema}.${t.name}`)} where code = ${code}`);
  });
}
