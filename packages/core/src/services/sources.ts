import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { notFound } from "../errors";
import { citation, source } from "../schema/kg";
import type { CitationInput, SourceInput } from "../validation";

export const listSources = () => db.select().from(source).orderBy(source.title);

export async function createSource(input: SourceInput) {
  const [row] = await db.insert(source).values(input).returning({ id: source.id });
  return row!;
}

export async function updateSource(id: string, input: SourceInput) {
  const rows = await db.update(source).set(input).where(eq(source.id, id)).returning({ id: source.id });
  if (!rows.length) throw notFound("nguồn");
}

export async function deleteSource(id: string) {
  const rows = await db.delete(source).where(eq(source.id, id)).returning({ id: source.id });
  if (!rows.length) throw notFound("nguồn");
}

export async function listCitations(subjectTable: string, subjectId: string) {
  return db
    .select({
      id: citation.id,
      locator: citation.locator,
      quote: citation.quote,
      confidence: citation.confidence,
      source: { id: source.id, title: source.title, author: source.author, url: source.url },
    })
    .from(citation)
    .innerJoin(source, eq(source.id, citation.sourceId))
    .where(sql`${citation.subjectTable} = ${subjectTable} and ${citation.subjectId} = ${subjectId}`)
    .orderBy(desc(citation.confidence));
}

export async function createCitation(input: CitationInput) {
  const [row] = await db.insert(citation).values(input).returning({ id: citation.id });
  return row!;
}

export async function deleteCitation(id: string) {
  const rows = await db.delete(citation).where(eq(citation.id, id)).returning({ id: citation.id });
  if (!rows.length) throw notFound("trích dẫn");
}
