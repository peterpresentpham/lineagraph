import { sql } from "drizzle-orm";
import { db } from "../db";

export type AuditEntry = {
  tableName: string;
  rowId: string;
  action: "create" | "update" | "delete";
  /** Who did it: the admin's id. */
  actor: string;
  /** What was sent (the new state of the row), for create and update. */
  after?: unknown;
};

/** Writes one row of the change log (kg.audit_log). */
export async function recordAudit(entry: AuditEntry) {
  await db.execute(
    sql`insert into kg.audit_log (table_name, row_id, action, actor, after)
        values (${entry.tableName}, ${entry.rowId}::uuid, ${entry.action}, ${entry.actor},
                ${entry.after === undefined ? null : JSON.stringify(entry.after)}::jsonb)`,
  );
}
