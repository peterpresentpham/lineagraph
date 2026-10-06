import { describe, expect, it } from "vitest";
import { centuryLabel, toRoman } from "./labels";

describe("centuries", () => {
  it("writes Roman numerals", () => {
    expect([1, 4, 9, 14, 15, 19, 21, 40].map(toRoman)).toEqual([
      "I",
      "IV",
      "IX",
      "XIV",
      "XV",
      "XIX",
      "XXI",
      "XL",
    ]);
  });

  it("labels centuries of both eras", () => {
    expect(centuryLabel(15)).toBe("Thế kỷ XV");
    expect(centuryLabel(-5)).toBe("Thế kỷ V TCN");
    expect(centuryLabel(-1)).toBe("Thế kỷ I TCN");
  });
});
