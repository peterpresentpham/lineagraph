// Consistency checks, section 7.6: ancestor cycles, parents born after their child,
// overlapping exclusive tenures, facts missing a source. Called by the API: on every write
// (warn, don't block) and on demand by GET /consistency-report. No background job.
export async function runConsistencyCheck(): Promise<never> {
  throw new Error("not_implemented");
}
