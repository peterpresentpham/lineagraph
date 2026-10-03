import { pgSchema, text, uuid, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { node } from "./kg";

// Learning layer: only references kg.node.id, never touches domain tables (design doc section 5.1).
export const learning = pgSchema("learning");

export const card = learning.table("card", {
  id: uuid("id").primaryKey().defaultRandom(),
  nodeId: uuid("node_id")
    .notNull()
    .references(() => node.id),
  relationId: uuid("relation_id"),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull().defaultNow(),
  stability: real("stability").notNull().default(0),
  difficulty: real("difficulty").notNull().default(0),
  state: text("state").notNull().default("new"),
});

export const reviewLog = learning.table("review_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => card.id),
  rating: integer("rating").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const progress = learning.table("progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  nodeId: uuid("node_id")
    .notNull()
    .references(() => node.id),
  masteredRatio: real("mastered_ratio").notNull().default(0),
  stats: jsonb("stats"),
});
