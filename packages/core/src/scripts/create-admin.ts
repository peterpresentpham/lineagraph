// Creates the admin account (or resets its password): `pnpm db:create-admin`.
// Reads ADMIN_EMAIL and ADMIN_PASSWORD from the root .env or the environment.
import bcrypt from "bcryptjs";
import { sql as dsql } from "drizzle-orm";
import { db, sql } from "../db";
import { admin } from "../schema/auth";

const MIN_PASSWORD_LENGTH = 12;

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
if (password.length < MIN_PASSWORD_LENGTH) {
  throw new Error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`);
}
// The old documented test login must never exist on a real database.
if (email.endsWith("@lineagraph.test")) {
  throw new Error("ADMIN_EMAIL must be a real address, not a @lineagraph.test one");
}

const passwordHash = await bcrypt.hash(password, 12);
// A changed password also ends every session that was open under the old one.
await db
  .insert(admin)
  .values({ email, passwordHash })
  .onConflictDoUpdate({
    target: admin.email,
    set: { passwordHash, tokenVersion: dsql`${admin.tokenVersion} + 1` },
  });

console.log(`Admin account ready: ${email}`);
await sql.end();
