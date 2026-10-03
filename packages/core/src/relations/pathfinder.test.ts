import { describe, expect, it } from "vitest";
import {
  buildAdjacency,
  findPaths,
  type RelationEdge,
  type RelationTypeInfo,
  type TenureEdge,
} from "./pathfinder";

const types = new Map<string, RelationTypeInfo>([
  ["parent_of", { code: "parent_of", inverse: "child_of", symmetric: false }],
  ["child_of", { code: "child_of", inverse: "parent_of", symmetric: false }],
  ["spouse_of", { code: "spouse_of", inverse: null, symmetric: true }],
  ["teacher_of", { code: "teacher_of", inverse: "student_of", symmetric: false }],
]);

const rel = (
  id: string,
  type: string,
  fromId: string,
  toId: string,
  extra: Partial<RelationEdge> = {},
): RelationEdge => ({
  id,
  type,
  fromId,
  toId,
  variant: null,
  label: null,
  disputed: false,
  ...extra,
});

describe("findPaths", () => {
  const relations = [
    rel("e1", "parent_of", "loi", "thai-tong"),
    rel("e2", "parent_of", "thai-tong", "thanh-tong"),
    rel("e3", "spouse_of", "thai-tong", "ngoc-dao"),
    rel("e4", "teacher_of", "nguyen-trai", "thai-tong"),
  ];
  const tenures: TenureEdge[] = [
    { id: "t1", personId: "loi", polityId: "hau-le", officeType: "emperor" },
    { id: "t2", personId: "thanh-tong", polityId: "hau-le", officeType: "emperor" },
  ];
  const adjacency = buildAdjacency(relations, tenures, types);

  it("walks parent links in both directions with the inverse type", () => {
    const [best] = findPaths(adjacency, "loi", "thanh-tong");
    expect(best!.steps.map((s) => s.type)).toEqual(["parent_of", "parent_of"]);
    const [back] = findPaths(adjacency, "thanh-tong", "loi");
    expect(back!.steps.map((s) => s.type)).toEqual(["child_of", "child_of"]);
    expect(back!.steps.every((s) => s.reversed)).toBe(true);
  });

  it("symmetric relations keep their type both ways", () => {
    const [path] = findPaths(adjacency, "ngoc-dao", "thai-tong");
    expect(path!.steps[0]!.type).toBe("spouse_of");
    expect(path!.steps[0]!.reversed).toBe(false);
  });

  it("ranks the family chain before the shared-polity chain", () => {
    const paths = findPaths(adjacency, "loi", "thanh-tong");
    expect(paths[0]!.cost).toBe(2);
    expect(paths[0]!.steps.map((s) => s.source)).toEqual(["relation", "relation"]);
    expect(paths[1]!.cost).toBe(4);
    expect(paths[1]!.steps.map((s) => s.source)).toEqual(["tenure", "tenure"]);
  });

  it("connects through other relation kinds", () => {
    const [path] = findPaths(adjacency, "nguyen-trai", "ngoc-dao");
    expect(path!.steps.map((s) => s.type)).toEqual(["teacher_of", "spouse_of"]);
  });

  it("returns nothing for unconnected nodes or when the cost limit is too low", () => {
    expect(findPaths(adjacency, "loi", "stranger")).toEqual([]);
    expect(findPaths(adjacency, "loi", "ngoc-dao", { maxCost: 1 })).toEqual([]);
  });

  it("skips disputed edges unless asked", () => {
    const withDisputed = buildAdjacency(
      [...relations, rel("e5", "parent_of", "loi", "ngoc-dao", { disputed: true })],
      [],
      types,
    );
    expect(findPaths(withDisputed, "loi", "ngoc-dao")[0]!.steps).toHaveLength(2);
    expect(
      findPaths(withDisputed, "loi", "ngoc-dao", { includeDisputed: true })[0]!.steps,
    ).toHaveLength(1);
  });
});
