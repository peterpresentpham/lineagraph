import { pgSchema, text, uuid, timestamp } from "drizzle-orm/pg-core";

// Admin accounts for the admin app. The public web app has no accounts.
export const auth = pgSchema("auth");

export const admin = auth.table("admin", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
