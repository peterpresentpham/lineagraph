// Queue runs on Postgres (SKIP LOCKED), no Redis added — design doc section 10.2.
// This skeleton only declares the jobs; the real queue-polling loop gets added once the
// `kg`/`history` schema is actually running on Postgres.
import { runConsistencyCheck } from "./jobs/consistency-check.js";
import { runGenerateQuestions } from "./jobs/generate-questions.js";
import { runImportWikidata } from "./jobs/import-wikidata.js";
import { runBackup } from "./jobs/backup.js";

const jobs = {
  "consistency-check": runConsistencyCheck,
  "generate-questions": runGenerateQuestions,
  "import-wikidata": runImportWikidata,
  backup: runBackup,
};

console.log("lineagraph worker ready, jobs:", Object.keys(jobs));
