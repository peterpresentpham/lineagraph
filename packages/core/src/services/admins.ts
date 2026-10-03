import { eq } from "drizzle-orm";
import { db } from "../db";
import { admin } from "../schema/auth";

export async function findAdminByEmail(email: string) {
  const [row] = await db.select().from(admin).where(eq(admin.email, email));
  return row ?? null;
}
