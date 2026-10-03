import {
  pgSchema,
  text,
  uuid,
  boolean,
  integer,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { node, fuzzyDate, language } from "./kg";

// History domain layer: person, polity, tenure, union, parentage.
// MVP scope skips place/event/kinship_ruleset — see design doc section 14.1.
export const history = pgSchema("history");

export const polityType = history.table("polity_type", {
  code: text("code").primaryKey(),
});

export const officeType = history.table("office_type", {
  code: text("code").primaryKey(),
  category: text("category").notNull().default("other"),
  isSovereign: boolean("is_sovereign").notNull().default(false),
});

export const successionMode = history.table("succession_mode", {
  code: text("code").primaryKey(),
});

export const person = history.table("person", {
  id: uuid("id")
    .primaryKey()
    .references(() => node.id),
  sex: text("sex").notNull().default("unknown"),
  historicity: text("historicity").notNull().default("historical"),
  summary: text("summary"),
});

export const personDate = history.table(
  "person_date",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => person.id),
    kind: text("kind").notNull(),
    dateId: uuid("date_id")
      .notNull()
      .references(() => fuzzyDate.id),
    placeId: uuid("place_id"),
    isPreferred: boolean("is_preferred").notNull().default(false),
  },
  (t) => [
    uniqueIndex("person_date_preferred_key")
      .on(t.personId, t.kind)
      .where(sql`${t.isPreferred} = true`),
  ],
);

export const polity = history.table("polity", {
  id: uuid("id")
    .primaryKey()
    .references(() => node.id),
  polityType: text("polity_type")
    .notNull()
    .references(() => polityType.code),
  startedId: uuid("started_id").references(() => fuzzyDate.id),
  endedId: uuid("ended_id").references(() => fuzzyDate.id),
  summary: text("summary"),
});

export const tenure = history.table(
  "tenure",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => person.id),
    polityId: uuid("polity_id").references(() => polity.id),
    officeType: text("office_type")
      .notNull()
      .references(() => officeType.code),
    successionMode: text("succession_mode").references(() => successionMode.code),
    startId: uuid("start_id").references(() => fuzzyDate.id),
    endId: uuid("end_id").references(() => fuzzyDate.id),
    seq: integer("seq"),
  },
  (t) => [
    index("tenure_person_idx").on(t.personId),
    index("tenure_polity_seq_idx").on(t.polityId, t.seq),
  ],
);

export const tenureEra = history.table("tenure_era", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenureId: uuid("tenure_id")
    .notNull()
    .references(() => tenure.id),
  name: text("name").notNull(),
  language: text("language").references(() => language.code),
  script: text("script"),
  startId: uuid("start_id").references(() => fuzzyDate.id),
  endId: uuid("end_id").references(() => fuzzyDate.id),
});

// Succession between two tenures, even across polities — a join table instead of a
// predecessor_tenure_id column, so it can hold splits/parallel polities (design doc section 5.11).
export const tenureSuccession = history.table(
  "tenure_succession",
  {
    fromTenureId: uuid("from_tenure_id")
      .notNull()
      .references(() => tenure.id),
    toTenureId: uuid("to_tenure_id")
      .notNull()
      .references(() => tenure.id),
    mode: text("mode")
      .notNull()
      .references(() => successionMode.code),
    state: text("state").notNull().default("proposed"),
  },
  (t) => [primaryKey({ columns: [t.fromTenureId, t.toTenureId] })],
);
