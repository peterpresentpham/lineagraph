import { sql } from "drizzle-orm";
import { db } from "../db";

export type AuditEntry = {
  tableName: string;
  rowId: string;
  action: "create" | "update" | "delete" | "restore";
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

export type RecentChange = {
  at: string;
  action: string;
  /** person, polity, event, place, source, tenure, relation... */
  table: string;
  rowId: string;
  /** The record's name when it is a person, polity or event (even if it was just deleted). */
  name: string | null;
};

/**
 * The latest changes from the change log, newest first, for the admin dashboard. A repeated edit
 * of one record within the list is shown once (its latest change), so a long editing session on
 * one person does not fill the whole list.
 */
export async function listRecentChanges(limit = 10): Promise<RecentChange[]> {
  const n = Math.min(Math.max(Math.trunc(limit) || 10, 1), 50);
  const rows = await db.execute<{
    at: Date | string;
    action: string;
    table_name: string;
    row_id: string;
    name: string | null;
  }>(
    sql`select a.at, a.action, a.table_name, a.row_id, pn.name
        from (
          select distinct on (table_name, row_id) at, action, table_name, row_id
          from kg.audit_log order by table_name, row_id, at desc) a
        left join kg.name pn on pn.node_id = a.row_id and pn.is_primary
        order by a.at desc limit ${n}`,
  );
  return rows.map((r) => ({
    at: new Date(r.at).toISOString(),
    action: r.action,
    table: r.table_name,
    rowId: r.row_id,
    name: r.name,
  }));
}
