// Keeps history.person_closure in sync with parent_of relations (section 5). Only added once ancestor
// queries are measured to be slow. Must run inside the same transaction as the parent_of relations
// write so the table can never be stale.
export async function syncPersonClosure(): Promise<never> {
  throw new Error("not_implemented");
}
