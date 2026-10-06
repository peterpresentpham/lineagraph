import {
  pgSchema,
  text,
  uuid,
  boolean,
  integer,
  smallint,
  primaryKey,
  uniqueIndex,
  index,
  check,
  doublePrecision,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { node, fuzzyDate, language } from "./kg";

// History domain layer: person, polity, tenure and place. Events and kinship rulesets are not
// modelled yet — see design doc section 14.1.
export const history = pgSchema("history");

export const polityType = history.table("polity_type", {
  code: text("code").primaryKey(),
});

export const officeType = history.table("office_type", {
  code: text("code").primaryKey(),
  category: text("category").notNull().default("other"),
  isSovereign: boolean("is_sovereign").notNull().default(false),
  // 1-5: how central an office is to its polity; sets the importance of the graph link
  // between an office-holder and the polity (5 = head of the polity, e.g. emperor, lord).
  importance: smallint("importance").notNull().default(3),
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
  birthPlaceId: uuid("birth_place_id").references(() => place.id),
  deathPlaceId: uuid("death_place_id").references(() => place.id),
});

// A place a person was born or died in. Places nest (a city inside a province inside a country)
// through parentId; coordinates are optional.
export const place = history.table(
  "place",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    nameNormalized: text("name_normalized").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => place.id),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    note: text("note"),
  },
  (t) => [
    index("place_name_idx").on(t.nameNormalized),
    index("place_parent_idx").on(t.parentId),
    check("place_latitude_check", sql`${t.latitude} between -90 and 90`),
    check("place_longitude_check", sql`${t.longitude} between -180 and 180`),
  ],
);

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
    // Dates or the very fact of holding this office are contested between sources.
    disputed: boolean("disputed").notNull().default(false),
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
