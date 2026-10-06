import { describe, expect, it } from "vitest";
import { personInput, relationshipInput, sourceInput, tenureInput } from "./validation";

const names = [{ name: "A", kind: "common", isPrimary: true }];
const person = (extra: object) => personInput.safeParse({ names, ...extra });

describe("date validation", () => {
  it("rejects a day that does not exist in its month", () => {
    expect(person({ birth: { year: 1900, month: 2, day: 29 } }).success).toBe(false);
    expect(person({ birth: { year: 1900, month: 4, day: 31 } }).success).toBe(false);
  });

  it("accepts leap day in a leap year and BCE years", () => {
    expect(person({ birth: { year: 2000, month: 2, day: 29 } }).success).toBe(true);
    expect(person({ birth: { year: -500 } }).success).toBe(true);
  });

  it("needs a month when a day is given", () => {
    expect(person({ birth: { year: 1900, day: 5 } }).success).toBe(false);
  });

  it("rejects death before birth but allows the same year with coarse precision", () => {
    expect(person({ birth: { year: 1500 }, death: { year: 1499 } }).success).toBe(false);
    expect(person({ birth: { year: 1500 }, death: { year: 1500 } }).success).toBe(true);
    expect(
      person({ birth: { year: 1500, month: 6 }, death: { year: 1500, month: 3 } }).success,
    ).toBe(false);
  });
});

describe("other inputs", () => {
  const id = "00000000-0000-4000-8000-000000000000";

  it("rejects an end date before the start on tenures and relationships", () => {
    const range = { start: { year: 1433 }, end: { year: 1428 } };
    expect(tenureInput.safeParse({ personId: id, officeType: "king", ...range }).success).toBe(
      false,
    );
    expect(
      relationshipInput.safeParse({ type: "ally_of", fromId: id, toId: id, ...range }).success,
    ).toBe(false);
  });

  it("requires a positive tenure order", () => {
    expect(tenureInput.safeParse({ personId: id, officeType: "king", seq: 0 }).success).toBe(false);
  });

  it("only allows http(s) source links", () => {
    expect(sourceInput.safeParse({ title: "x", url: "javascript:alert(1)" }).success).toBe(false);
    expect(sourceInput.safeParse({ title: "x", url: "https://example.org/a" }).success).toBe(true);
    expect(sourceInput.safeParse({ title: "x" }).success).toBe(true);
  });
});
