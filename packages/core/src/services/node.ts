import { eq, sql } from "drizzle-orm";
import { attribute, name, node } from "../schema/kg";
import type { Tx } from "../db";
import { normalizeText, slugify } from "./text";

type NameInput = { name: string; kind: string; language?: string | null; isPrimary: boolean };

type AttributeValue = { type: string; value: string };

export async function setAttributes(tx: Tx, nodeId: string, attributes: AttributeValue[]) {
  await tx.delete(attribute).where(eq(attribute.nodeId, nodeId));
  if (attributes.length) {
    await tx
      .insert(attribute)
      .values(attributes.map((a, i) => ({ nodeId, type: a.type, value: a.value, sortOrder: i })));
  }
}

export async function createNode(
  tx: Tx,
  kind: "person" | "polity",
  names: NameInput[],
  body: string | null = null,
) {
  const primary = names.find((n) => n.isPrimary)!;
  const base = slugify(primary.name);
  let slug = base;
  for (let i = 2; ; i++) {
    const [taken] = await tx.select({ id: node.id }).from(node).where(eq(node.slug, slug));
    if (!taken) break;
    slug = `${base}-${i}`;
  }
  const [row] = await tx
    .insert(node)
    .values({ kind, slug, body, reviewState: "approved" })
    .returning({ id: node.id, slug: node.slug });
  await insertNames(tx, row!.id, names);
  return row!;
}

export async function insertNames(tx: Tx, nodeId: string, names: NameInput[]) {
  await tx.insert(name).values(
    names.map((n) => ({
      nodeId,
      name: n.name,
      nameNormalized: normalizeText(n.name),
      kind: n.kind,
      language: n.language || null,
      isPrimary: n.isPrimary,
    })),
  );
}

export async function replaceNames(
  tx: Tx,
  nodeId: string,
  names: NameInput[],
  body?: string | null,
) {
  await tx.delete(name).where(eq(name.nodeId, nodeId));
  await insertNames(tx, nodeId, names);
  await tx
    .update(node)
    .set({ updatedAt: sql`now()`, ...(body !== undefined ? { body } : {}) })
    .where(eq(node.id, nodeId));
}

export async function softDeleteNode(tx: Tx, nodeId: string) {
  await tx
    .update(node)
    .set({ deletedAt: sql`now()` })
    .where(eq(node.id, nodeId));
}
