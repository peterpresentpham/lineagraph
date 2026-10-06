import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { notFound } from "../errors";
import { citation, source } from "../schema/kg";
import type { CitationInput, SourceInput } from "../validation";

export const listSources = () => db.select().from(source).orderBy(source.title);

export type BibliographyEntry = {
  id: string;
  title: string;
  author: string | null;
  kind: string | null;
  url: string | null;
  license: string | null;
  reliability: number | null;
  citations: number;
};

/**
 * The public reading list: every source that backs at least one live record, with how many
 * citations rely on it. Editorial notes stay out; citations of deleted records are not counted.
 */
export async function listBibliography(opts: { limit?: number; offset?: number } = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const live = sql`not exists (
    select 1 from kg.node n where n.id = c.subject_id and n.deleted_at is not null)`;
  const [rows, [{ count }]] = await Promise.all([
    db.execute<BibliographyEntry>(
      sql`select s.id, s.title, s.author, s.kind, s.url, s.license, s.reliability,
                 count(c.id)::int as citations
          from kg.source s join kg.citation c on c.source_id = s.id and ${live}
          group by s.id order by s.title limit ${limit} offset ${offset}`,
    ),
    db.execute<{ count: number }>(
      sql`select count(distinct c.source_id)::int as count from kg.citation c where ${live}`,
    ),
  ]);
  return { items: [...rows], total: count };
}

export async function createSource(input: SourceInput) {
  const [row] = await db.insert(source).values(input).returning({ id: source.id });
  return row!;
}

export async function updateSource(id: string, input: SourceInput) {
  const rows = await db
    .update(source)
    .set(input)
    .where(eq(source.id, id))
    .returning({ id: source.id });
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
      stance: citation.stance,
      source: {
        id: source.id,
        title: source.title,
        author: source.author,
        url: source.url,
        license: source.license,
      },
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
