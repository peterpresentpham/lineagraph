// Bulk import from Wikidata: dry-run by default, shows a diff, --apply is what actually writes.
// Imported data lands in "proposed" state, hidden until reviewed. Section 11.2, post-MVP.
export async function runImportWikidata(options: { apply: boolean }) {
  throw new Error("not_implemented");
}
