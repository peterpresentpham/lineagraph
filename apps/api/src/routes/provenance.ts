import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";

// Sources + citations: public read (source transparency), write is admin-only — design doc section 9.
export const provenanceRouter = Router();

provenanceRouter.get("/sources/:id", (req, res) => {
  res.status(501).json({ error: "not_implemented", id: req.params.id });
});

provenanceRouter.get("/citations", (req, res) => {
  res.status(501).json({ error: "not_implemented", subjectId: req.query.subjectId });
});

provenanceRouter.post("/sources", requireAdmin, (_req, res) => {
  res.status(501).json({ error: "not_implemented" });
});

provenanceRouter.post("/citations", requireAdmin, (_req, res) => {
  res.status(501).json({ error: "not_implemented" });
});
