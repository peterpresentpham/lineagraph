import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { ServiceError, notFound } from "../errors";
import { relation } from "../schema/kg";
import type { Tx } from "../db";
import type { RelationshipInput } from "../validation";
import { deleteDates, insertDate, parseDate } from "./dates";
import type { DateView } from "./dates";

export type NodeRef = { id: string; kind: "person" | "polity"; slug: string; name: string };

type TypeRow = {
  code: string; inverse_code: string | null; is_symmetric: boolean; is_primary: boolean; is_acyclic: boolean;
  subject_kinds: string[]; object_kinds: string[]; category: string; label: string | null;
};

async function loadTypes(): Promise<Map<string, TypeRow>> {
  const rows = await db.execute<TypeRow>(
    sql`select t.code, t.inverse_code, t.is_symmetric, t.is_primary, t.is_acyclic, t.subject_kinds,
               t.object_kinds, t.category, l.text as label
        from kg.relation_type t
        left join kg.label l on l.namespace = 'relation_type' and l.code = t.code and l.language = 'vi'`,
  );
  return new Map(rows.map((r) => [r.code, r]));
}

/** Names, slugs and kinds for a set of nodes (deleted nodes are left out). */
export async function getNodeRefs(ids: string[]): Promise<Map<string, NodeRef>> {
  if (!ids.length) return new Map();
  const rows = await db.execute<{ id: string; kind: "person" | "polity"; slug: string; name: string }>(
    sql`select n.id, n.kind, n.slug, pn.name
        from kg.node n join kg.name pn on pn.node_id = n.id and pn.is_primary
        where n.deleted_at is null and n.id in (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})`,
  );
  return new Map(rows.map((r) => [r.id, r]));
}

// Turns what the admin typed into the row that is stored: the primary side of the type,
// symmetric pairs in a fixed order, kinds and cycles checked.
async function normalize(input: RelationshipInput, ignoreId?: string) {
  const types = await loadTypes();
  let type = types.get(input.type);
  if (!type) throw new ServiceError(400, "Loại quan hệ không tồn tại");
  let fromId = input.fromId;
  let toId = input.toId;
  if (fromId === toId) throw new ServiceError(400, "Hai đối tượng phải khác nhau");
  if (!type.is_primary) {
    type = types.get(type.inverse_code!)!;
    [fromId, toId] = [toId, fromId];
  }
  if (type.is_symmetric && fromId > toId) [fromId, toId] = [toId, fromId];

  const refs = await getNodeRefs([fromId, toId]);
  const from = refs.get(fromId);
  const to = refs.get(toId);
  if (!from || !to) throw notFound("đối tượng");
  const kindName = (k: string) => (k === "person" ? "nhân vật" : "chính thể");
  const fits = (a: NodeRef, b: NodeRef) => type!.subject_kinds.includes(a.kind) && type!.object_kinds.includes(b.kind);
  // A symmetric type may be given in either order.
  if (!fits(from, to) && !(type.is_symmetric && fits(to, from))) {
    throw new ServiceError(
      400,
      `Quan hệ "${type.label ?? type.code}" chỉ áp dụng giữa ${type.subject_kinds.map(kindName).join("/")} và ${type.object_kinds.map(kindName).join("/")}`,
    );
  }

  if (type.is_acyclic) {
    // Reject when `from` is already reachable from `to` along the same type.
    const [hit] = await db.execute<{ found: boolean }>(
      sql`with recursive down(id) as (
            select to_id from kg.relation where type = ${type.code} and from_id = ${toId}
              ${ignoreId ? sql`and id <> ${ignoreId}::uuid` : sql``}
            union
            select r.to_id from kg.relation r join down d on r.from_id = d.id where r.type = ${type.code}
          ) select exists(select 1 from down where id = ${fromId}) as found`,
    );
    if (hit?.found) throw new ServiceError(400, "Quan hệ này tạo thành vòng lặp (ví dụ một người là tổ tiên của chính mình)");
  }
  return { type: type.code, fromId, toId };
}

export type RelationshipView = {
  id: string;
  type: string;
  typeLabel: string;
  category: string;
  from: NodeRef;
  to: NodeRef;
  variant: string | null;
  label: string | null;
  note: string | null;
  disputed: boolean;
  start: DateView | null;
  end: DateView | null;
};

type RelationRow = {
  id: string; type: string; from_id: string; to_id: string; variant: string | null; label: string | null;
  note: string | null; disputed: boolean; start_edtf: string | null; end_edtf: string | null;
};

const relationSelect = sql`
  select r.id, r.type, r.from_id, r.to_id, r.variant, r.label, r.note, r.disputed,
         sd.edtf as start_edtf, ed.edtf as end_edtf
  from kg.relation r
  left join kg.fuzzy_date sd on sd.id = r.start_id
  left join kg.fuzzy_date ed on ed.id = r.end_id`;

async function toViews(rows: RelationRow[]): Promise<RelationshipView[]> {
  const types = await loadTypes();
  const refs = await getNodeRefs([...new Set(rows.flatMap((r) => [r.from_id, r.to_id]))]);
  return rows.flatMap((r) => {
    const from = refs.get(r.from_id);
    const to = refs.get(r.to_id);
    if (!from || !to) return []; // one end was deleted
    const t = types.get(r.type);
    return [
      {
        id: r.id,
        type: r.type,
        typeLabel: t?.label ?? r.type,
        category: t?.category ?? "other",
        from,
        to,
        variant: r.variant,
        label: r.label,
        note: r.note,
        disputed: r.disputed,
        start: parseDate(r.start_edtf),
        end: parseDate(r.end_edtf),
      },
    ];
  });
}

export async function listRelationships(opts: { nodeId?: string; type?: string; q?: string; limit?: number; offset?: number }) {
  const limit = Math.min(opts.limit ?? 100, 500);
  const where = [sql`true`];
  if (opts.nodeId) where.push(sql`(r.from_id = ${opts.nodeId}::uuid or r.to_id = ${opts.nodeId}::uuid)`);
  if (opts.type) where.push(sql`r.type = ${opts.type}`);
  if (opts.q) {
    const needle = "%" + opts.q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d") + "%";
    where.push(
      sql`exists (select 1 from kg.name x where x.node_id in (r.from_id, r.to_id) and x.name_normalized like ${needle})`,
    );
  }
  const rows = await db.execute<RelationRow>(
    sql`${relationSelect} where ${sql.join(where, sql` and `)} order by r.created_at desc limit ${limit} offset ${opts.offset ?? 0}`,
  );
  return toViews(rows);
}

export async function getRelationship(id: string) {
  const rows = await db.execute<RelationRow>(sql`${relationSelect} where r.id = ${id}::uuid`);
  const [view] = await toViews(rows);
  if (!view) throw notFound("quan hệ");
  return view;
}

/** One node's relationships as seen from that node, with the inverse label when it is the target. */
export type NodeRelation = {
  id: string;
  /** Type as read from this node ("parent_of" when it is the parent, "child_of" when the child). */
  type: string;
  typeLabel: string;
  category: string;
  other: NodeRef;
  variant: string | null;
  label: string | null;
  note: string | null;
  disputed: boolean;
  start: DateView | null;
  end: DateView | null;
};

export async function getNodeRelations(nodeId: string): Promise<NodeRelation[]> {
  const types = await loadTypes();
  const views = await listRelationships({ nodeId, limit: 500 });
  return views.map((v) => {
    const outgoing = v.from.id === nodeId;
    const primary = types.get(v.type);
    const seenType = outgoing || primary?.is_symmetric ? v.type : (primary?.inverse_code ?? v.type);
    const t = types.get(seenType);
    return {
      id: v.id,
      type: seenType,
      typeLabel: t?.label ?? seenType,
      category: v.category,
      other: outgoing ? v.to : v.from,
      variant: v.variant,
      label: v.label,
      note: v.note,
      disputed: v.disputed,
      start: v.start,
      end: v.end,
    };
  });
}

export async function createRelationship(input: RelationshipInput) {
  const { type, fromId, toId } = await normalize(input);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(relation)
      .values({
        type, fromId, toId,
        variant: input.variant, label: input.label, note: input.note, disputed: input.disputed,
        startId: await insertDate(tx, input.start),
        endId: await insertDate(tx, input.end),
        state: "approved",
      })
      .returning({ id: relation.id });
    return row!;
  });
}

export async function updateRelationship(id: string, input: RelationshipInput) {
  const { type, fromId, toId } = await normalize(input, id);
  await db.transaction(async (tx: Tx) => {
    const [old] = await tx.select().from(relation).where(eq(relation.id, id));
    if (!old) throw notFound("quan hệ");
    await tx
      .update(relation)
      .set({
        type, fromId, toId,
        variant: input.variant, label: input.label, note: input.note, disputed: input.disputed,
        startId: await insertDate(tx, input.start),
        endId: await insertDate(tx, input.end),
      })
      .where(eq(relation.id, id));
    await deleteDates(tx, [old.startId, old.endId]);
  });
}

export async function deleteRelationship(id: string) {
  await db.transaction(async (tx: Tx) => {
    const [old] = await tx.select().from(relation).where(eq(relation.id, id));
    if (!old) throw notFound("quan hệ");
    await tx.execute(sql`delete from kg.citation where subject_table = 'relation' and subject_id = ${id}::uuid`);
    await tx.delete(relation).where(eq(relation.id, id));
    await deleteDates(tx, [old.startId, old.endId]);
  });
}

export async function getRelationshipForEdit(id: string) {
  const v = await getRelationship(id);
  return { ...v, fromId: v.from.id, toId: v.to.id };
}
