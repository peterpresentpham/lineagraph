import { sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { ServiceError, notFound } from "../errors";
import { likePrefix, normalizeText, slugify } from "./text";

export type NameInput = {
  name: string;
  kind: string;
  language?: string | null;
  script?: string | null;
  isPrimary: boolean;
};

export type AttributeValue = { type: string; value: string };

/**
 * A slug for a new node: the slugified primary name, or that plus "-2", "-3", ... when taken.
 * One query for every candidate, instead of one network round trip per candidate.
 */
export async function uniqueSlug(names: NameInput[]): Promise<string> {
  const primary = names.find((n) => n.isPrimary)!;
  const base = slugify(primary.name);
  const taken = new Set(
    (
      await db.execute<{ slug: string }>(
        sql`select slug from kg.node where slug = ${base} or slug like ${likePrefix(`${base}-`)}`,
      )
    ).map((r) => r.slug),
  );
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

/**
 * The CTEs that replace a node's names and attributes, to be joined into a larger
 * data-modifying statement. `from` is the name of an earlier CTE that returns the node's row
 * only when the write is allowed to go ahead (for example the node was just inserted, or the
 * update matched an existing live node of the right kind). Both the deletes and the inserts are
 * conditional on it, so a wrong or missing id changes nothing.
 */
export function nameAttributeCtes(
  nodeId: string,
  names: NameInput[],
  attributes: AttributeValue[],
  from: string,
): SQL[] {
  const nameRows = names.map((n) => ({
    name: n.name,
    name_normalized: normalizeText(n.name),
    kind: n.kind,
    language: n.language || null,
    script: n.script || null,
    is_primary: n.isPrimary,
  }));
  const attributeRows = attributes.map((a, i) => ({ type: a.type, value: a.value, sort: i }));
  const source = sql.raw(from);
  return [
    sql`names_del as (
      delete from kg.name where node_id = ${nodeId}::uuid and exists (select 1 from ${source}))`,
    sql`names_ins as (
      insert into kg.name (node_id, name, name_normalized, kind, language, script, is_primary)
      select ${nodeId}::uuid, x.name, x.name_normalized, x.kind, x.language, x.script, x.is_primary
      from jsonb_to_recordset(${JSON.stringify(nameRows)}::jsonb) as x(
        name text, name_normalized text, kind text, language text, script text, is_primary boolean),
        ${source})`,
    sql`attr_del as (
      delete from kg.attribute where node_id = ${nodeId}::uuid and exists (select 1 from ${source}))`,
    sql`attr_ins as (
      insert into kg.attribute (node_id, type, value, sort_order)
      select ${nodeId}::uuid, x.type, x.value, x.sort
      from jsonb_to_recordset(${JSON.stringify(attributeRows)}::jsonb) as x(
        type text, value text, sort int),
        ${source})`,
  ];
}

/**
 * Soft-deletes a person or polity (by id or slug) in one statement. Refuses while live
 * relationships or tenures still point at it (the admin removes those first), so no dangling
 * links are left hidden in the data. Its own citations go with it.
 */
export async function softDeleteNode(idOrSlug: string, kind: "person" | "polity") {
  const [r] = await db.execute<{
    found: boolean;
    relations: number;
    tenures: number;
    deleted: number;
  }>(
    sql`with target as (
          select id from kg.node
          where (id::text = ${idOrSlug} or slug = ${idOrSlug}) and kind = ${kind} and deleted_at is null),
        used as (
          select
            (select count(*)::int from kg.relation r
               join target t on t.id in (r.from_id, r.to_id)
               join kg.node o on o.id = case when r.from_id = t.id then r.to_id else r.from_id end
                 and o.deleted_at is null) as relations,
            (select count(*)::int from history.tenure h
               join target t on t.id in (h.person_id, h.polity_id)) as tenures),
        gone as (
          update kg.node set deleted_at = now()
          where id in (select id from target) and (select relations + tenures from used) = 0
          returning id),
        cit as (delete from kg.citation where subject_id in (select id from gone))
        select exists (select 1 from target) as found, used.relations, used.tenures,
               (select count(*)::int from gone) as deleted
        from used`,
  );
  if (!r?.found) throw notFound(kind === "person" ? "nhân vật" : "chính thể");
  if (!r.deleted) {
    throw new ServiceError(
      409,
      `Còn ${r.relations} quan hệ và ${r.tenures} chức vụ liên quan, hãy xoá chúng trước`,
    );
  }
}
