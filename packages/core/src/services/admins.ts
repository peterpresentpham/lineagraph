import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { admin } from "../schema/auth";
import { cached, invalidate } from "./cache";

export async function findAdminByEmail(email: string) {
  const [row] = await db.select().from(admin).where(eq(admin.email, email));
  return row ?? null;
}

const sessionKey = (id: string) => `admin:${id}`;

/**
 * What a token is checked against on every admin request: the account's current token version, or
 * null when the account no longer exists. Cached for a few seconds, so a removed admin or a
 * revoked session loses access within that time instead of when the token expires.
 */
export function getAdminSession(id: string): Promise<{ tokenVersion: number } | null> {
  return cached(sessionKey(id), 5_000, async () => {
    const [row] = await db
      .select({ tokenVersion: admin.tokenVersion })
      .from(admin)
      .where(eq(admin.id, id));
    return row ?? null;
  });
}

/** Ends every session of one admin (logout, password change): tokens issued earlier stop working. */
export async function revokeAdminSessions(id: string) {
  await db
    .update(admin)
    .set({ tokenVersion: sql`${admin.tokenVersion} + 1` })
    .where(eq(admin.id, id));
  invalidate(sessionKey(id));
}
