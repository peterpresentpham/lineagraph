import { describe, expect, it } from "vitest";
import { likeContains, normalizeText, slugify } from "./text";

describe("normalizeText", () => {
  it("strips Vietnamese diacritics", () => {
    expect(normalizeText("Lê Lợi")).toBe("le loi");
    expect(normalizeText("Đinh Bộ Lĩnh")).toBe("dinh bo linh");
  });

  it("folds letters that have no decomposition", () => {
    expect(normalizeText("Łódź")).toBe("lodz");
    expect(normalizeText("Straße")).toBe("strasse");
  });

  it("romanizes other scripts so they stay searchable", () => {
    expect(normalizeText("Αλέξανδρος")).toBe("alexandros");
    expect(normalizeText("秦始皇")).toBe("qin shi huang");
  });
});

describe("slugify", () => {
  it("never falls back to a bare placeholder for non-Latin names", () => {
    expect(slugify("秦始皇")).toBe("qin-shi-huang");
    expect(slugify("Київ")).toBe("kiiv");
  });

  it("collapses punctuation and trims dashes", () => {
    expect(slugify("  Lê Thái Tổ (Lê Lợi)! ")).toBe("le-thai-to-le-loi");
  });
});

describe("likeContains", () => {
  it("escapes LIKE wildcards", () => {
    expect(likeContains("100%_a\\b")).toBe("%100\\%\\_a\\\\b%");
  });
});
