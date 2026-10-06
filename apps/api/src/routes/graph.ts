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
} from "@lineagraph/core";
import { z } from "zod";
import { flagQuery, handle, intQuery, param, strQuery } from "../http.js";

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
        sort: req.query.sort === "birth" ? "birth" : "name",
        limit: intQuery(req.query.limit, "limit"),
        offset: Math.max(intQuery(req.query.offset, "offset") ?? 0, 0),
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
        sort: req.query.sort === "name" ? "name" : "date",
        limit: intQuery(req.query.limit, "limit"),
        offset: intQuery(req.query.offset, "offset"),
      }),
    );
  }),
);

graphRouter.get(
  "/polities/:slug",
  handle(async (req, res) => res.json(await getPolity(param(req, "slug")))),
);

const csv = (v: unknown) => (typeof v === "string" && v ? v.split(",").filter(Boolean) : undefined);

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
        types: z.array(z.string()).optional(),
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
