import { describe, expect, it } from "vitest";
import { describeKinship, type KinPerson, type ParentLink } from "./kinship";
import {
  buildAdjacency,
  searchPaths,
  type RelationEdge,
  type RelationTypeInfo,
} from "./pathfinder";

// Dense and inbred graphs used to blow up the exhaustive searches; these keep them bounded.
describe("search on dense graphs", () => {
  const types = new Map<string, RelationTypeInfo>([
    ["ally_of", { code: "ally_of", inverse: null, symmetric: true }],
  ]);
  const edge = (id: string, a: string, b: string): RelationEdge => ({
    id,
    type: "ally_of",
    fromId: a,
    toId: b,
    variant: null,
    label: null,
    disputed: false,
  });

  it("finds the short path through a fully connected hub without hitting the visit limit", () => {
    const relations: RelationEdge[] = [];
    const hub = Array.from({ length: 40 }, (_, i) => `h${i}`);
    hub.forEach((a, i) =>
      hub.slice(i + 1).forEach((b, j) => relations.push(edge(`${a}-${b}-${j}`, a, b))),
    );
    relations.push(edge("s", "start", "h0"), edge("e", "h39", "end"));
    const { paths, truncated } = searchPaths(buildAdjacency(relations, [], types), "start", "end");
    expect(truncated).toBe(false);
    expect(paths[0]!.steps).toHaveLength(3);
  });

  it("returns no path, quickly, when the target is out of reach", () => {
    const relations = [edge("a", "x", "y")];
    const result = searchPaths(buildAdjacency(relations, [], types), "x", "nowhere");
    expect(result).toEqual({ paths: [], truncated: false });
  });
});

describe("kinship with pedigree collapse", () => {
  it("handles a house where cousins keep marrying for 25 generations", () => {
    const people = new Map<string, KinPerson>();
    const links: ParentLink[] = [];
    // Each generation has two siblings who are both parents of both children of the next one.
    for (let g = 0; g < 25; g++) {
      for (const s of ["a", "b"])
        people.set(`${s}${g}`, { id: `${s}${g}`, sex: "male", birthYear: null });
    }
    for (let g = 0; g < 24; g++) {
      for (const p of ["a", "b"]) {
        for (const c of ["a", "b"]) {
          links.push({
            parentId: `${p}${g}`,
            childId: `${c}${g + 1}`,
            variant: "biological",
            disputed: false,
          });
        }
      }
    }
    const started = Date.now();
    const kinship = describeKinship("a24", "b24", people, links);
    expect(Date.now() - started).toBeLessThan(1000);
    expect(kinship).not.toBeNull();
  });
});
