import { Router } from "express";
import { getTimeline, parseSearchKinds, randomSlug, search, searchSimilar } from "@lineagraph/core";
import { handle, textQuery } from "../http.js";

export const searchRouter = Router();

searchRouter.get(
  "/search",
  handle(async (req, res) => {
    // `kinds=person,polity` narrows the search (the graph and relation pickers have no use for events).
    const kinds = textQuery(req.query.kinds, "kinds", 50)?.split(",");
    res.json(await search(textQuery(req.query.q, "q") ?? "", parseSearchKinds(kinds)));
  }),
);

// "1428" or "490 TCN" → the year to list entries for; null when the query is not a year.
export function parseYearQuery(q: string): number | null {
  const m = /^(?:năm\s+)?(\d{1,4})\s*(tcn|bc)?$/i.exec(q.trim());
  if (!m) return null;
  const year = Number(m[1]);
  return year === 0 ? null : m[2] ? -year : year;
}

// What to offer next to (or instead of) the plain results: entries dated to a typed year, and
// near matches when nothing matched exactly. Public and read-only, like /search.
searchRouter.get(
  "/search/related",
  handle(async (req, res) => {
    const q = textQuery(req.query.q, "q") ?? "";
    const year = parseYearQuery(q);
    const [entries, similar] = await Promise.all([
      year === null ? [] : getTimeline({ year, limit: 50 }),
      year === null && req.query.similar === "1" ? searchSimilar(q) : [],
    ]);
    res.json({ year, entries, similar });
  }),
);

// One random entry to open, for the "xem ngẫu nhiên" link. Never cached, or it would not be random.
searchRouter.get(
  "/random",
  handle(async (req, res) => {
    const kind = parseSearchKinds([String(req.query.kind ?? "person")])[0] ?? "person";
    const slug = await randomSlug(kind);
    res.set("Cache-Control", "no-store").json({ kind, slug });
  }),
);
