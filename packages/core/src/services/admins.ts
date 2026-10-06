import { eq } from "drizzle-orm";
import { db } from "../db";
import { admin } from "../schema/auth";
import { cached } from "./cache";

export async function findAdminByEmail(email: string) {
  const [row] = await db.select().from(admin).where(eq(admin.email, email));
  return row ?? null;
}

// Used on every admin request, so the answer is cached briefly: a removed admin loses access
// within a minute instead of when their token expires.
export function adminExists(id: string): Promise<boolean> {
  return cached(`admin:${id}`, 60_000, async () => {
    const [row] = await db.select({ id: admin.id }).from(admin).where(eq(admin.id, id));
    return !!row;
  });
}
