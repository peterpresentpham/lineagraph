import { Router } from "express";
import {
  expandEgoGraph,
  getEgoGraph,
  getLineage,
  getPerson,
  getPolity,
  getPolityGraph,
  listPersons,
  listPolities,
  ServiceError,
} from "@lineagraph/core";
import { z } from "zod";
import { flagQuery, handle, intQuery, param, strQuery, offsetQuery } from "../http.js";

// Public read routes for the web app — no login.
export const graphRouter = Router();

graphRouter.get(
  "/persons",
  handle(async (req, res) => {
    res.json(
      await listPersons({
        q: typeof req.query.q === "string" ? req.query.q : undefined,
        sex: strQuery(req.query.sex),
        historicity: strQuery(req.query.historicity),
        noSource: flagQuery(req.query.noSource),
        sort:
          req.query.sort === "birth" ? "birth" : req.query.sort === "notable" ? "notable" : "name",
        limit: intQuery(req.query.limit, "limit"),
        offset: offsetQuery(req.query.offset) ?? 0,
      }),
    );
  }),
);

graphRouter.get(
  "/persons/:slug",
  handle(async (req, res) => res.json(await getPerson(param(req, "slug")))),
);

for (const direction of ["ancestors", "descendants"] as const) {
  graphRouter.get(
    `/persons/:slug/${direction}`,
    handle(async (req, res) => {
      const person = await getPerson(param(req, "slug"));
      const depth = intQuery(req.query.depth, "depth");
      res.json(await getLineage(person.id, direction, depth));
    }),
  );
}

graphRouter.get(
  "/polities",
  handle(async (req, res) => {
    res.json(
      await listPolities({
        q: typeof req.query.q === "string" ? req.query.q : undefined,
        type: typeof req.query.type === "string" ? req.query.type : undefined,
        noSource: flagQuery(req.query.noSource),
        sort:
          req.query.sort === "name" ? "name" : req.query.sort === "notable" ? "notable" : "date",
        limit: intQuery(req.query.limit, "limit"),
        offset: offsetQuery(req.query.offset),
      }),
    );
  }),
);

graphRouter.get(
  "/polities/:slug",
  handle(async (req, res) => res.json(await getPolity(param(req, "slug")))),
);

// A comma-separated list from the query string, with a ceiling on how many entries it may hold.
const csv = (v: unknown) => {
  const items = typeof v === "string" && v ? v.split(",").filter(Boolean) : undefined;
  if (items && items.length > 20) throw new ServiceError(400, "Quá nhiều giá trị trong danh sách");
  return items;
};

// Graph around one person or polity, for the browser to draw (React Flow). Capped at `limit`
// nodes; nodes with neighbours that were cut off are listed in `hidden`.
graphRouter.get(
  "/nodes/:slug/graph",
  handle(async (req, res) => {
    res.json(
      await getEgoGraph(param(req, "slug"), {
        depth: intQuery(req.query.depth, "depth"),
        limit: intQuery(req.query.limit, "limit"),
        types: csv(req.query.types),
        includeDisputed: req.query.disputed !== "0",
        minImportance: intQuery(req.query.minImportance, "minImportance"),
      }),
    );
  }),
);

// "Load more" around one node on screen. A read-only POST so the list of known ids fits in the body.
graphRouter.post(
  "/graph/expand",
  handle(async (req, res) => {
    const body = z
      .object({
        nodeId: z.string().uuid(),
        known: z.array(z.string().uuid()).max(1000),
        limit: z.number().int().min(1).max(100).optional(),
        types: z.array(z.string().max(50)).max(20).optional(),
        includeDisputed: z.boolean().optional(),
        minImportance: z.number().int().min(1).max(5).optional(),
      })
      .parse(req.body);
    res.json(await expandEgoGraph(body.nodeId, body.known, body));
  }),
);

graphRouter.get(
  "/polities/:slug/graph",
  handle(async (req, res) => {
    res.json(await getPolityGraph(param(req, "slug"), { includeFamily: req.query.family !== "0" }));
  }),
);
