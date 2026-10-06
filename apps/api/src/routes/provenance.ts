import { Router } from "express";
import {
  citationInput,
  createCitation,
  createSource,
  deleteCitation,
  deleteSource,
  listBibliography,
  listCitations,
  listSources,
  sourceInput,
  updateSource,
} from "@lineagraph/core";
import { handle, intQuery, offsetQuery, param } from "../http.js";
import { requireAdmin } from "../middleware/auth.js";

// Sources + citations: public read (source transparency), write is admin-only — design doc section 9.
export const provenanceRouter = Router();

// The full table, with editors' notes: admin only. The public reads the bibliography below.
provenanceRouter.get(
  "/sources",
  requireAdmin,
  handle(async (_req, res) => res.json(await listSources())),
);

// Public reading list: sources that back at least one live record, without editorial notes.
provenanceRouter.get(
  "/bibliography",
  handle(async (req, res) => {
    res.json(
      await listBibliography({
        limit: intQuery(req.query.limit, "limit"),
        offset: offsetQuery(req.query.offset),
      }),
    );
  }),
);

provenanceRouter.get(
  "/citations",
  handle(async (req, res) => {
    const { subjectTable, subjectId } = req.query;
    if (typeof subjectTable !== "string" || typeof subjectId !== "string") {
      res.status(400).json({ error: "Thiếu subjectTable hoặc subjectId" });
      return;
    }
    res.json(await listCitations(subjectTable, subjectId));
  }),
);

provenanceRouter.post(
  "/sources",
  requireAdmin,
  handle(async (req, res) => {
    res.status(201).json(await createSource(sourceInput.parse(req.body)));
  }),
);
provenanceRouter.put(
  "/sources/:id",
  requireAdmin,
  handle(async (req, res) => {
    await updateSource(param(req, "id"), sourceInput.parse(req.body));
    res.status(204).end();
  }),
);
provenanceRouter.delete(
  "/sources/:id",
  requireAdmin,
  handle(async (req, res) => {
    await deleteSource(param(req, "id"));
    res.status(204).end();
  }),
);
provenanceRouter.post(
  "/citations",
  requireAdmin,
  handle(async (req, res) => {
    res.status(201).json(await createCitation(citationInput.parse(req.body)));
  }),
);
provenanceRouter.delete(
  "/citations/:id",
  requireAdmin,
  handle(async (req, res) => {
    await deleteCitation(param(req, "id"));
    res.status(204).end();
  }),
);
