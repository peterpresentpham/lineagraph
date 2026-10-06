import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { ServiceError, notFound } from "../errors";
import { label, relationType } from "../schema/kg";
import type { RelationTypeInput } from "../validation";
import { TYPES_CACHE_KEY, invalidate } from "./cache";
import { LABEL_LANGUAGE } from "./labels";

export type RelationTypeView = {
  code: string;
  label: string;
  category: string;
  inverseCode: string | null;
  inverseLabel: string | null;
  isSymmetric: boolean;
  isPrimary: boolean;
  isAcyclic: boolean;
  defaultImportance: number;
  subjectKinds: string[];
  objectKinds: string[];
};

export async function listRelationTypes(): Promise<RelationTypeView[]> {
  const rows = await db.execute<{
    code: string;
    label: string | null;
    category: string;
    inverse_code: string | null;
    is_symmetric: boolean;
    is_primary: boolean;
    is_acyclic: boolean;
    default_importance: number;
    subject_kinds: string[];
    object_kinds: string[];
  }>(
    sql`select t.code, l.text as label, t.category, t.inverse_code, t.is_symmetric, t.is_primary, t.is_acyclic,
               t.default_importance, t.subject_kinds, t.object_kinds
        from kg.relation_type t
        left join kg.label l on l.namespace = 'relation_type' and l.code = t.code and l.language = ${LABEL_LANGUAGE}
        order by t.category, t.is_primary desc, t.code`,
  );
  const labels = new Map(rows.map((r) => [r.code, r.label ?? r.code]));
  return rows.map((r) => ({
    code: r.code,
    label: r.label ?? r.code,
    category: r.category,
    inverseCode: r.inverse_code,
    inverseLabel: r.inverse_code ? (labels.get(r.inverse_code) ?? r.inverse_code) : null,
    isSymmetric: r.is_symmetric,
    isPrimary: r.is_primary,
    isAcyclic: r.is_acyclic,
    defaultImportance: r.default_importance,
    subjectKinds: r.subject_kinds,
    objectKinds: r.object_kinds,
  }));
}

async function setLabel(code: string, text: string) {
  await db
    .insert(label)
    .values({ namespace: "relation_type", code, language: LABEL_LANGUAGE, text })
    .onConflictDoUpdate({ target: [label.namespace, label.code, label.language], set: { text } });
}

// Creates a relation type, and its inverse as a second (non-primary) row when it has one.
export async function createRelationType(input: RelationTypeInput) {
  const symmetric = input.isSymmetric || !input.inverseCode;
  if (!symmetric && !input.inverseLabel)
    throw new ServiceError(400, "Nhập nhãn cho chiều ngược lại");
  if (!symmetric && input.inverseCode === input.code)
    throw new ServiceError(400, "Mã chiều ngược phải khác mã chính");
  await db.transaction(async (tx) => {
    await tx.insert(relationType).values({
      code: input.code,
      category: input.category,
      inverseCode: symmetric ? null : input.inverseCode,
      isSymmetric: symmetric,
      isPrimary: true,
      isAcyclic: input.isAcyclic,
      defaultImportance: input.defaultImportance,
      subjectKinds: input.subjectKinds,
      objectKinds: input.objectKinds,
    });
    if (!symmetric) {
      await tx.insert(relationType).values({
        code: input.inverseCode!,
        category: input.category,
        inverseCode: input.code,
        isSymmetric: false,
        isPrimary: false,
        isAcyclic: false,
        defaultImportance: input.defaultImportance,
        subjectKinds: input.objectKinds,
        objectKinds: input.subjectKinds,
      });
    }
  });
  await setLabel(input.code, input.label);
  if (!symmetric) await setLabel(input.inverseCode!, input.inverseLabel!);
  invalidate(TYPES_CACHE_KEY);
}

// Only labels, category and the acyclic flag can change: the code and kinds are referenced by data.
export async function updateRelationType(
  code: string,
  input: {
    label: string;
    inverseLabel?: string | null;
    category?: string;
    isAcyclic?: boolean;
    defaultImportance?: number;
  },
) {
  const [row] = await db.select().from(relationType).where(eq(relationType.code, code));
  if (!row) throw notFound("loại quan hệ");
  await setLabel(code, input.label);
  if (row.inverseCode && input.inverseLabel) await setLabel(row.inverseCode, input.inverseLabel);
  // Both sides of an inverse pair share one default importance.
  if (input.defaultImportance !== undefined) {
    await db
      .update(relationType)
      .set({ defaultImportance: input.defaultImportance })
      .where(inArray(relationType.code, row.inverseCode ? [code, row.inverseCode] : [code]));
  }
  await db
    .update(relationType)
    .set({
      ...(input.category ? { category: input.category } : {}),
      ...(input.isAcyclic !== undefined && row.isPrimary ? { isAcyclic: input.isAcyclic } : {}),
    })
    .where(eq(relationType.code, code));
  invalidate(TYPES_CACHE_KEY);
}

// Deletes a type (and its inverse). Fails with a foreign-key error while relationships still use it.
export async function deleteRelationType(code: string) {
  const [row] = await db.select().from(relationType).where(eq(relationType.code, code));
  if (!row) throw notFound("loại quan hệ");
  const codes = row.inverseCode ? [code, row.inverseCode] : [code];
  await db.transaction(async (tx) => {
    for (const c of codes)
      await tx.execute(sql`delete from kg.label where namespace = 'relation_type' and code = ${c}`);
    // The pair references each other, so detach before deleting.
    await tx.execute(
      sql`update kg.relation_type set inverse_code = null where code in (${sql.join(
        codes.map((c) => sql`${c}`),
        sql`, `,
      )})`,
    );
    for (const c of codes) await tx.execute(sql`delete from kg.relation_type where code = ${c}`);
  });
  invalidate(TYPES_CACHE_KEY);
}
