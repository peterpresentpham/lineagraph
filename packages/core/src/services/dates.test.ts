import { describe, expect, it } from "vitest";
import { personInput } from "../validation";
import { parseDate, toRow } from "./dates";

const day = (year: number, month: number, d: number, calendar?: "gregorian" | "julian") =>
  toRow({ year, month, day: d, approximate: false, calendar }).earliestJdn;

describe("Julian Day Numbers", () => {
  it("matches known dates", () => {
    expect(day(2000, 1, 1)).toBe(2451545);
    // The Gregorian reform: 4 Oct 1582 (Julian) was followed by 15 Oct 1582 (Gregorian).
    expect(day(1582, 10, 4, "julian")).toBe(2299160);
    expect(day(1582, 10, 15)).toBe(2299161);
  });

  it("counts BCE years without a year 0", () => {
    // 1 BCE is the year just before 1 CE (and a Julian leap year, as astronomical year 0).
    expect(day(1, 1, 1, "julian") - day(-1, 1, 1, "julian")).toBe(366);
    expect(day(-1, 1, 1, "julian") - day(-2, 1, 1, "julian")).toBe(365);
    // The Ides of March, 44 BCE (Julian).
    expect(day(-44, 3, 15, "julian")).toBe(1705426);
  });

  it("orders BCE before CE", () => {
    expect(day(-500, 1, 1)).toBeLessThan(day(-100, 1, 1));
    expect(day(-100, 1, 1)).toBeLessThan(day(100, 1, 1));
  });

  it("makes a year-only date span the whole year", () => {
    const row = toRow({ year: 1427, approximate: false });
    expect(row.latestJdn - row.earliestJdn).toBe(364);
    const leap = toRow({ year: 1428, approximate: false });
    expect(leap.latestJdn - leap.earliestJdn).toBe(365);
    expect(toRow({ year: 1428, month: 2, approximate: false }).precision).toBe("month");
  });
});

describe("stored text form", () => {
  it("round trips through parseDate, calendar and approximation included", () => {
    const row = toRow({ year: -44, month: 3, day: 15, approximate: true, calendar: "julian" });
    expect(row.edtf).toBe("-0044-03-15j~");
    expect(parseDate(row.edtf)).toMatchObject({
      year: -44,
      month: 3,
      day: 15,
      approximate: true,
      calendar: "julian",
    });
  });

  it("labels BCE years and Julian dates for readers", () => {
    expect(parseDate("-0210")?.label).toBe("210 TCN");
    expect(parseDate("1428-04-02j")?.label).toBe("2/4/1428 (lịch Julius)");
    expect(parseDate("1428~")?.label).toBe("khoảng 1428");
  });

  it("leaves old Gregorian strings unchanged", () => {
    expect(parseDate("1428-04-02")).toMatchObject({ calendar: "gregorian", year: 1428 });
    expect(parseDate("nonsense")).toBeNull();
  });
});

describe("date validation by calendar", () => {
  const born = (b: object) =>
    personInput.safeParse({ names: [{ name: "A", kind: "common", isPrimary: true }], birth: b });

  it("rejects year 0", () => {
    expect(born({ year: 0 }).success).toBe(false);
  });

  it("knows 1900 is a leap year only in the Julian calendar", () => {
    expect(born({ year: 1900, month: 2, day: 29 }).success).toBe(false);
    expect(born({ year: 1900, month: 2, day: 29, calendar: "julian" }).success).toBe(true);
  });

  it("accepts the deep past and far future bounds", () => {
    expect(born({ year: -9999 }).success).toBe(true);
    expect(born({ year: 9999 }).success).toBe(true);
    expect(born({ year: 10000 }).success).toBe(false);
  });
});
