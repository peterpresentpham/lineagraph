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
export const sql = postgres(url, { max: 20 });
export const db = drizzle(sql, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
