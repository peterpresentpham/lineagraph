import { pgSchema, text, uuid, timestamp, integer } from "drizzle-orm/pg-core";

// Admin accounts for the admin app. The public web app has no accounts.
export const auth = pgSchema("auth");

export const admin = auth.table("admin", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // Bumped on logout and on a password change; a token carries the version it was issued under,
  // so raising it ends every session that is already out there.
  tokenVersion: integer("token_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
