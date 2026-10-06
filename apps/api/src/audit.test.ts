import { describe, expect, it } from "vitest";
import { redact } from "./middleware/audit.js";

describe("redact", () => {
  it("hides secret-looking fields at any depth and leaves the rest alone", () => {
    expect(
      redact({
        name: "Lê Lợi",
        password: "hunter2",
        nested: { apiToken: "abc", list: [{ Secret: "x", ok: 1 }] },
      }),
    ).toEqual({
      name: "Lê Lợi",
      password: "[redacted]",
      nested: { apiToken: "[redacted]", list: [{ Secret: "[redacted]", ok: 1 }] },
    });
  });

  it("passes through values that are not objects", () => {
    expect(redact(null)).toBeNull();
    expect(redact("text")).toBe("text");
    expect(redact(3)).toBe(3);
  });
});
