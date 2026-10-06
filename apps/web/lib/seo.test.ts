import { describe, expect, it } from "vitest";
import { listMetadata, recordOpenGraph } from "./seo";

const base = { title: "Nhân vật", description: "d", path: "/persons" };

describe("listMetadata", () => {
  it("makes the first page its own canonical and indexable", () => {
    const m = listMetadata({ ...base, page: 1, filtered: false });
    expect(m.alternates?.canonical).toBe("/persons");
    expect(m.robots).toBeUndefined();
    expect(m.title).toBe("Nhân vật");
  });

  it("gives later pages their own canonical, not page 1's", () => {
    const m = listMetadata({ ...base, page: 3, filtered: false });
    expect(m.alternates?.canonical).toBe("/persons?page=3");
    expect(m.title).toBe("Nhân vật (trang 3)");
  });

  it("keeps a searched or filtered view out of the index but follows its links", () => {
    const m = listMetadata({ ...base, page: 2, filtered: true });
    expect(m.alternates?.canonical).toBe("/persons");
    expect(m.robots).toEqual({ index: false, follow: true });
  });
});

describe("recordOpenGraph", () => {
  it("repeats the fields Next would otherwise drop from the parent", () => {
    expect(recordOpenGraph({ title: "Lê Lợi", description: "d", path: "/person/le-loi" })).toEqual({
      title: "Lê Lợi",
      description: "d",
      url: "/person/le-loi",
      siteName: "Sử Phả",
      locale: "vi_VN",
    });
  });
});
