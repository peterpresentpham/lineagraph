// Bulk import from Wikidata, run by hand: `pnpm import:wikidata [--apply]`.
// Dry-run by default and prints a diff; only --apply writes. Imported data lands in
// "proposed" state, hidden until an admin reviews it. Section 11.2, post-MVP.
// This is the only maintenance task kept as a script: it calls an external service and can
// run for minutes, so it does not belong in an API request.
const apply = process.argv.includes("--apply");

console.log(apply ? "import-wikidata: applying" : "import-wikidata: dry-run");
throw new Error("not_implemented");
