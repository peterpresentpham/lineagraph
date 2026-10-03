import { describe, expect, it } from "vitest";
import { countHidden, egoBfs, type EgoLink } from "./egograph";

const links: EgoLink[] = [
  { a: "root", b: "dad", rank: 0 },
  { a: "root", b: "friend", rank: 2 },
  { a: "root", b: "ally", rank: 1 },
  { a: "dad", b: "grandpa", rank: 0 },
  { a: "friend", b: "stranger", rank: 2 },
];
const fetchLinks = async (ids: string[]) =>
  links.filter((l) => ids.includes(l.a) || ids.includes(l.b));

describe("egoBfs", () => {
  it("walks outward layer by layer up to the depth", async () => {
    const r = await egoBfs({ rootIds: ["root"], depth: 1, limit: 99, fetchLinks });
    expect(r.added).toEqual(["dad", "ally", "friend"]);
    expect(r.truncated).toBe(false);
    const r2 = await egoBfs({ rootIds: ["root"], depth: 2, limit: 99, fetchLinks });
    expect(r2.added).toEqual(["dad", "ally", "friend", "grandpa", "stranger"]);
  });

  it("keeps family links first when the limit cuts a layer", async () => {
    const r = await egoBfs({ rootIds: ["root"], depth: 2, limit: 2, fetchLinks });
    expect(r.added).toEqual(["dad", "ally"]);
    expect(r.truncated).toBe(true);
  });

  it("never returns known nodes and does not walk through them", async () => {
    const r = await egoBfs({
      rootIds: ["root"],
      known: new Set(["dad"]),
      depth: 2,
      limit: 99,
      fetchLinks,
    });
    expect(r.added).not.toContain("dad");
    expect(r.added).not.toContain("grandpa");
  });

  it("copes with cycles", async () => {
    const cyclic: EgoLink[] = [
      { a: "x", b: "y", rank: 0 },
      { a: "y", b: "z", rank: 0 },
      { a: "z", b: "x", rank: 0 },
    ];
    const r = await egoBfs({ rootIds: ["x"], depth: 5, limit: 99, fetchLinks: async () => cyclic });
    expect(r.added.sort()).toEqual(["y", "z"]);
  });
});

describe("countHidden", () => {
  it("counts distinct neighbours that are not in the set", () => {
    const hidden = countHidden(new Set(["root", "dad"]), links);
    expect(hidden.get("root")).toBe(2);
    expect(hidden.get("dad")).toBe(1);
    expect(hidden.has("friend")).toBe(false);
  });
});
