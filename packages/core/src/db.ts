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

export const sql = postgres(url, { max: 5 });
export const db = drizzle(sql, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
