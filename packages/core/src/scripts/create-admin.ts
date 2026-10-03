// Creates the admin account (or resets its password): `pnpm db:create-admin`.
// Reads ADMIN_EMAIL and ADMIN_PASSWORD from the root .env.
import bcrypt from "bcryptjs";
import { db, sql } from "../db";
import { admin } from "../schema/auth";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
if (password.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters");

const passwordHash = await bcrypt.hash(password, 12);
await db
  .insert(admin)
  .values({ email, passwordHash })
  .onConflictDoUpdate({ target: admin.email, set: { passwordHash } });

console.log(`Admin account ready: ${email}`);
await sql.end();
