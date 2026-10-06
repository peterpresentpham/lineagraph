import { randomUUID } from "node:crypto";
import { sql, type SQL } from "drizzle-orm";
import type { DateInput } from "../validation";

// Years are numbered the way history books do: 1 CE is preceded by 1 BCE (-1), there is no year
// 0. The Julian Day Number arithmetic below wants astronomical years (which do have a year 0), so
// a BCE year moves up by one first: 1 BCE is astronomical 0, 44 BCE is -43.
export const astronomicalYear = (year: number) => (year < 0 ? year + 1 : year);

// Proleptic Gregorian date -> Julian Day Number (astronomical year).
function gregorianJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

// Julian calendar date -> Julian Day Number (astronomical year); used for dates before the
// Gregorian reform that sources give in the calendar of their day.
function julianJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
}

const pad = (n: number, width: number) => String(Math.abs(n)).padStart(width, "0");

/**
 * The stored form of a date: a text form (`edtf`, "-0044-03-15j~": BCE sign, year, month, day,
 * `j` when the source calendar is Julian, `~` when approximate), its precision, and the earliest
 * and latest Julian Day Number it can mean, which is what sorting and comparing use.
 */
export function toRow(input: DateInput) {
  const { year, month, day, approximate } = input;
  const calendar = input.calendar ?? "gregorian";
  const toJdn = calendar === "julian" ? julianJdn : gregorianJdn;
  const y = astronomicalYear(year);
  const sign = year < 0 ? "-" : "";
  let edtf = `${sign}${pad(year, 4)}`;
  let precision = "year";
  let earliest = toJdn(y, 1, 1);
  let latest = toJdn(y, 12, 31);
  if (month) {
    edtf += `-${pad(month, 2)}`;
    precision = "month";
    earliest = toJdn(y, month, 1);
    latest = (month === 12 ? toJdn(y + 1, 1, 1) : toJdn(y, month + 1, 1)) - 1;
    if (day) {
      edtf += `-${pad(day, 2)}`;
      precision = "day";
      earliest = latest = toJdn(y, month, day);
    }
  }
  if (calendar === "julian") edtf += "j";
  if (approximate) edtf += "~";
  return { edtf, precision, earliestJdn: earliest, latestJdn: latest, sourceCalendar: calendar };
}

/**
 * A fuzzy date as an `insert` statement for a data-modifying CTE, with its id generated here so
 * the row that references it can be written in the same SQL statement (one network round trip).
 * `guard` makes the insert conditional (for example "only if the row being updated exists").
 */
export function dateInsert(input: DateInput | null | undefined, guard: SQL = sql`true`) {
  if (!input) return { id: null, insert: null };
  const id = randomUUID();
  const r = toRow(input);
  return {
    id,
    insert: sql`insert into kg.fuzzy_date (id, edtf, precision, earliest_jdn, latest_jdn, source_calendar)
      select ${id}::uuid, ${r.edtf}, ${r.precision}, ${r.earliestJdn}, ${r.latestJdn}, ${r.sourceCalendar}
      where ${guard}`,
  };
}

export type DateView = {
  year: number;
  month: number | null;
  day: number | null;
  approximate: boolean;
  /** Calendar the date was given in; "julian" is shown to readers, Gregorian is the default. */
  calendar: "gregorian" | "julian";
  label: string;
};

// Parses the stored EDTF string back into parts plus a Vietnamese display label.
export function parseDate(edtf: string | null): DateView | null {
  if (!edtf) return null;
  const match = /^(-?)(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?(j)?(~)?$/.exec(edtf);
  if (!match) return null;
  const year = Number(match[2]) * (match[1] ? -1 : 1);
  const month = match[3] ? Number(match[3]) : null;
  const day = match[4] ? Number(match[4]) : null;
  const calendar = match[5] ? "julian" : "gregorian";
  const approximate = !!match[6];
  const yearLabel = year < 0 ? `${-year} TCN` : String(year);
  let label = yearLabel;
  if (month && day) label = `${day}/${month}/${yearLabel}`;
  else if (month) label = `${month}/${yearLabel}`;
  if (calendar === "julian") label = `${label} (lịch Julius)`;
  if (approximate) label = `khoảng ${label}`;
  return { year, month, day, approximate, calendar, label };
}
