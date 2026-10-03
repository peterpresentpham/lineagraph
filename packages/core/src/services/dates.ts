import { eq, inArray } from "drizzle-orm";
import { fuzzyDate } from "../schema/kg";
import type { Tx } from "../db";
import type { DateInput } from "../validation";

// Proleptic Gregorian date -> Julian Day Number.
function toJdn(year: number, month: number, day: number): number {
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

const pad = (n: number, width: number) => String(Math.abs(n)).padStart(width, "0");

function toRow(input: DateInput) {
  const { year, month, day, approximate } = input;
  const sign = year < 0 ? "-" : "";
  let edtf = `${sign}${pad(year, 4)}`;
  let precision = "year";
  let earliest = toJdn(year, 1, 1);
  let latest = toJdn(year, 12, 31);
  if (month) {
    edtf += `-${pad(month, 2)}`;
    precision = "month";
    earliest = toJdn(year, month, 1);
    latest = (month === 12 ? toJdn(year + 1, 1, 1) : toJdn(year, month + 1, 1)) - 1;
    if (day) {
      edtf += `-${pad(day, 2)}`;
      precision = "day";
      earliest = latest = toJdn(year, month, day);
    }
  }
  if (approximate) edtf += "~";
  return { edtf, precision, earliestJdn: earliest, latestJdn: latest, sourceCalendar: "gregorian" };
}

export async function insertDate(tx: Tx, input: DateInput | null | undefined) {
  if (!input) return null;
  const [row] = await tx.insert(fuzzyDate).values(toRow(input)).returning({ id: fuzzyDate.id });
  return row!.id;
}

export async function deleteDates(tx: Tx, ids: (string | null)[]) {
  const real = ids.filter((id): id is string => !!id);
  if (real.length) await tx.delete(fuzzyDate).where(inArray(fuzzyDate.id, real));
}

export async function replaceDate(tx: Tx, oldId: string | null, input: DateInput | null | undefined) {
  return { oldId, newId: await insertDate(tx, input) };
}

export type DateView = {
  year: number;
  month: number | null;
  day: number | null;
  approximate: boolean;
  label: string;
};

// Parses the stored EDTF string back into parts plus a Vietnamese display label.
export function parseDate(edtf: string | null): DateView | null {
  if (!edtf) return null;
  const match = /^(-?)(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?(~)?$/.exec(edtf);
  if (!match) return null;
  const year = Number(match[2]) * (match[1] ? -1 : 1);
  const month = match[3] ? Number(match[3]) : null;
  const day = match[4] ? Number(match[4]) : null;
  const approximate = !!match[5];
  const yearLabel = year < 0 ? `${-year} TCN` : String(year);
  let label = yearLabel;
  if (month && day) label = `${day}/${month}/${yearLabel}`;
  else if (month) label = `${month}/${yearLabel}`;
  if (approximate) label = `khoảng ${label}`;
  return { year, month, day, approximate, label };
}

export async function getDateEdtf(tx: Tx, id: string | null) {
  if (!id) return null;
  const [row] = await tx.select({ edtf: fuzzyDate.edtf }).from(fuzzyDate).where(eq(fuzzyDate.id, id));
  return parseDate(row?.edtf ?? null);
}
