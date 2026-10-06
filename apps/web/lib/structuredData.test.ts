import { describe, expect, it } from "vitest";
import { breadcrumbData, isoDate } from "./structuredData";
import type { DateValue } from "./types";

const date = (year: number, month: number | null = null, day: number | null = null): DateValue => ({
  year,
  month,
  day,
  approximate: false,
  label: String(year),
});

describe("isoDate", () => {
  it("writes years, months and days of the common era", () => {
    expect(isoDate(date(1428))).toBe("1428");
    expect(isoDate(date(1428, 4))).toBe("1428-04");
    expect(isoDate(date(1428, 4, 7))).toBe("1428-04-07");
    expect(isoDate(date(33))).toBe("0033");
  });

  it("writes years before the common era in ISO 8601's astronomical numbering", () => {
    // 1 BCE is year 0000 and 44 BCE is -0043: ISO has a year zero, history books do not.
    expect(isoDate(date(-1))).toBe("0000");
    expect(isoDate(date(-44, 3, 15))).toBe("-0043-03-15");
    expect(isoDate(date(-490))).toBe("-0489");
  });

  it("returns null when there is no date", () => {
    expect(isoDate(null)).toBeNull();
    expect(isoDate(undefined)).toBeNull();
  });
});

describe("breadcrumbData", () => {
  it("lists the home page first and numbers the trail from 1", () => {
    const data = breadcrumbData("https://suPha.example", [
      { name: "Nhân vật", path: "/persons" },
      { name: "Lê Lợi", path: "/person/le-loi" },
    ]);
    expect(data["@type"]).toBe("BreadcrumbList");
    expect(data.itemListElement.map((i) => [i.position, i.item])).toEqual([
      [1, "https://suPha.example"],
      [2, "https://suPha.example/persons"],
      [3, "https://suPha.example/person/le-loi"],
    ]);
  });
});
