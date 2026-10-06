import {
  pgSchema,
  text,
  uuid,
  boolean,
  timestamp,
  smallint,
  integer,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Shared base layer for every domain (person, polity, place, event, ...).
// Details and rationale for each table: docs/design.md section 5, current diagrams in docs/database.md.
export const kg = pgSchema("kg");

export const nodeKind = kg.table("node_kind", {
  code: text("code").primaryKey(),
});

export const nameKind = kg.table("name_kind", {
  code: text("code").primaryKey(),
});

export const language = kg.table("language", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
});

export const calendar = kg.table("calendar", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
});

export const relationType = kg.table(
  "relation_type",
  {
    code: text("code").primaryKey(),
    category: text("category").notNull(),
    inverseCode: text("inverse_code"),
    isSymmetric: boolean("is_symmetric").notNull().default(false),
    subjectKinds: text("subject_kinds").array().notNull(),
    objectKinds: text("object_kinds").array().notNull(),
    // Of an inverse pair (parent_of / child_of) only the primary type is ever stored; the
    // other is derived when reading, so one real-world fact is exactly one row.
    isPrimary: boolean("is_primary").notNull().default(true),
    // Cycles are rejected for acyclic types (e.g. nobody can be their own ancestor).
    isAcyclic: boolean("is_acyclic").notNull().default(false),
    // Starting importance (1-5) of a new relationship of this type. Each relationship stores its
    // own `importance`; this is only the value the form and the service fall back to on create.
    defaultImportance: smallint("default_importance").notNull().default(3),
  },
  (t) => [
    check("relation_type_default_importance_check", sql`${t.defaultImportance} between 1 and 5`),
  ],
);

export const label = kg.table(
  "label",
  {
    namespace: text("namespace").notNull(),
    code: text("code").notNull(),
    language: text("language")
      .notNull()
      .references(() => language.code),
    text: text("text").notNull(),
  },
  (t) => [primaryKey({ columns: [t.namespace, t.code, t.language] })],
);

export const node = kg.table(
  "node",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind")
      .notNull()
      .references(() => nodeKind.code),
    slug: text("slug").notNull().unique(),
    // Long-form text (biography / history); `summary` on person/polity stays a short lead.
    body: text("body"),
    reviewState: text("review_state").notNull().default("draft"),
    mergedInto: uuid("merged_into"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("node_id_kind_key").on(t.id, t.kind),
    // Lists and searches only ever look at live nodes of one kind.
    index("node_kind_live_idx")
      .on(t.kind)
      .where(sql`${t.deletedAt} is null`),
  ],
);

export const collection = kg.table("collection", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  parentId: uuid("parent_id"),
  kind: text("kind").notNull(),
  description: text("description"),
});

export const nodeCollection = kg.table(
  "node_collection",
  {
    nodeId: uuid("node_id")
      .notNull()
      .references(() => node.id),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collection.id),
  },
  (t) => [primaryKey({ columns: [t.nodeId, t.collectionId] })],
);

export const name = kg.table(
  "name",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => node.id),
    name: text("name").notNull(),
    nameNormalized: text("name_normalized").notNull(),
    kind: text("kind")
      .notNull()
      .references(() => nameKind.code),
    language: text("language").references(() => language.code),
    script: text("script"),
    isPrimary: boolean("is_primary").notNull().default(false),
    validFrom: uuid("valid_from"),
    validTo: uuid("valid_to"),
  },
  (t) => [
    index("name_normalized_idx").on(t.nameNormalized),
    index("name_node_idx").on(t.nodeId),
    // Makes `like '%text%'` search use an index instead of scanning every name.
    index("name_normalized_trgm_idx").using("gin", t.nameNormalized.op("gin_trgm_ops")),
    // "Exactly one primary name per node" is enforced by validation (`names` in validation.ts), not
    // by a unique index: a unique index is checked row by row, so it would reject the single-
    // statement delete-and-reinsert that updates a node's names.
  ],
);

export const externalId = kg.table(
  "external_id",
  {
    nodeId: uuid("node_id")
      .notNull()
      .references(() => node.id),
    system: text("system").notNull(),
    value: text("value").notNull(),
  },
  (t) => [primaryKey({ columns: [t.system, t.value] }), index("external_id_node_idx").on(t.nodeId)],
);

export const fuzzyDate = kg.table("fuzzy_date", {
  id: uuid("id").primaryKey().defaultRandom(),
  edtf: text("edtf"),
  earliestJdn: integer("earliest_jdn"),
  latestJdn: integer("latest_jdn"),
  precision: text("precision").notNull(),
  sourceCalendar: text("source_calendar").references(() => calendar.code),
  originalText: text("original_text"),
  note: text("note"),
});

export const source = kg.table(
  "source",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    author: text("author"),
    kind: text("kind"),
    language: text("language").references(() => language.code),
    url: text("url"),
    license: text("license"),
    reliability: smallint("reliability"),
    note: text("note"),
  },
  (t) => [check("source_reliability_check", sql`${t.reliability} between 1 and 5`)],
);

export const citation = kg.table(
  "citation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectTable: text("subject_table").notNull(),
    subjectId: uuid("subject_id").notNull(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => source.id),
    locator: text("locator"),
    quote: text("quote"),
    confidence: smallint("confidence").notNull(),
    // What the source says about the fact: backs it, disputes it, or only mentions it.
    stance: text("stance").notNull().default("supports"),
  },
  (t) => [
    check("citation_stance_check", sql`${t.stance} in ('supports', 'disputes', 'mentions')`),
    index("citation_subject_idx").on(t.subjectTable, t.subjectId),
    // The same source and place in it cannot back the same fact twice.
    uniqueIndex("citation_unique_key").on(
      t.subjectTable,
      t.subjectId,
      t.sourceId,
      sql`coalesce(${t.locator}, '')`,
    ),
    check("citation_confidence_check", sql`${t.confidence} between 1 and 5`),
  ],
);

export const relation = kg.table(
  "relation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type")
      .notNull()
      .references(() => relationType.code),
    fromId: uuid("from_id")
      .notNull()
      .references(() => node.id),
    toId: uuid("to_id")
      .notNull()
      .references(() => node.id),
    // Sub-kind inside a type, e.g. parent_of: biological | adoptive | step; spouse_of: marriage | concubine.
    variant: text("variant"),
    // Free text shown with the relation, e.g. "Hoàng hậu".
    label: text("label"),
    note: text("note"),
    // Sources disagree; hidden from path-finding unless the caller opts in.
    disputed: boolean("disputed").notNull().default(false),
    // Why the relation is contested, and by whom (shown with the "sources disagree" badge).
    disputeNote: text("dispute_note"),
    // How sure the editor is that the relation is real: 1 (a guess) to 5 (well attested). Null = not rated.
    confidence: smallint("confidence"),
    // 1 (minor) to 5 (core). Graph views show only links at or above a threshold at first and
    // reveal the rest on "load more", so a dynasty graph can start with just its rulers.
    importance: smallint("importance").notNull().default(3),
    startId: uuid("start_id").references(() => fuzzyDate.id),
    endId: uuid("end_id").references(() => fuzzyDate.id),
    state: text("state").notNull().default("proposed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("relation_from_type_idx").on(t.fromId, t.type),
    index("relation_to_type_idx").on(t.toId, t.type),
    // One real-world fact is one row: same type, same pair, same variant cannot repeat.
    uniqueIndex("relation_unique_key").on(
      t.type,
      t.fromId,
      t.toId,
      sql`coalesce(${t.variant}, '')`,
    ),
    check("relation_not_self_check", sql`${t.fromId} <> ${t.toId}`),
    check("relation_importance_check", sql`${t.importance} between 1 and 5`),
    check("relation_confidence_check", sql`${t.confidence} between 1 and 5`),
  ],
);

// Kinds of free-form facts about a node (hometown, burial place, capital...). Managed in the
// admin like every other registry, so new kinds need no code change.
export const attributeType = kg.table("attribute_type", {
  code: text("code").primaryKey(),
});

export const attribute = kg.table(
  "attribute",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => node.id),
    type: text("type")
      .notNull()
      .references(() => attributeType.code),
    value: text("value").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("attribute_node_idx").on(t.nodeId, t.sortOrder)],
);

export const auditLog = kg.table("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  tableName: text("table_name").notNull(),
  rowId: uuid("row_id").notNull(),
  action: text("action").notNull(),
  actor: text("actor").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});
