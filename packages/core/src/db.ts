import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadRootEnv } from "./env";
import * as kgSchema from "./schema/kg";
import * as historySchema from "./schema/history";
import * as learningSchema from "./schema/learning";
import * as authSchema from "./schema/auth";

loadRootEnv();

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

export const schema = { ...kgSchema, ...historySchema, ...learningSchema, ...authSchema };

// Each DB round trip here pays a large, mostly-fixed network latency tax (see note in
// services/cache.ts), so handlers fetch their independent data with Promise.all rather than
// one query at a time. A single request can easily have 5-10 queries in flight at once; a pool
// of 5 forced half of them to queue behind the others, which silently re-serialized the very
// round trips the app was trying to parallelize. 20 gives real headroom at this data size.
//
// Limits that keep one bad request from tying the database up. `statement_timeout` is sent as a
// startup parameter, which a pooled Neon endpoint (host contains "-pooler") rejects; there it is set
// on the database role instead (see docs/operations.md). DB_STATEMENT_TIMEOUT_MS=0 turns it off.
const statementTimeoutMs = Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? 8000);
const pooled = /-pooler\./.test(new URL(url).hostname);
export const sql = postgres(url, {
  max: 20,
  connect_timeout: 10,
  idle_timeout: 30,
  max_lifetime: 60 * 30,
  ...(statementTimeoutMs > 0 && !pooled
    ? { connection: { statement_timeout: statementTimeoutMs } }
    : {}),
});
export const db = drizzle(sql, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
