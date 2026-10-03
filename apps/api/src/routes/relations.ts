import { Router } from "express";
import { z } from "zod";

// Core feature of the app: pick two people -> list of relationships.
// Fully specified in design doc section 7.7 — write golden tests (7.7.7b) before implementing the real algorithm.
export const relationsRouter = Router();

const querySchema = z.object({
  a: z.string(),
  b: z.string(),
  includeDisputed: z.coerce.boolean().optional().default(false),
});

relationsRouter.get("/relations", (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.issues });
    return;
  }
  res.status(501).json({ error: "not_implemented", ...parsed.data });
});
