import { describe, expect, it } from "vitest";
import { vietnamDate } from "./challenge.js";

describe("vietnamDate", () => {
  it("rolls over at midnight in Vietnam (UTC+7), not UTC", () => {
    expect(vietnamDate(new Date("2026-10-23T16:59:00Z"))).toBe("2026-10-23");
    expect(vietnamDate(new Date("2026-10-23T17:00:00Z"))).toBe("2026-10-24");
  });
});
