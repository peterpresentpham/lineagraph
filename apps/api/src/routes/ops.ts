import { Router } from "express";
import { getStats, runConsistencyCheck } from "@lineagraph/core";
import { handle } from "../http.js";
import { requireAdmin } from "../middleware/auth.js";

// Admin dashboard numbers. The consistency report (section 7.6) is computed on demand by
// runConsistencyCheck in @lineagraph/core; no background job.
export const opsRouter = Router();
opsRouter.use("/stats", requireAdmin);

opsRouter.get(
  "/stats",
  handle(async (_req, res) => res.json(await getStats())),
);

opsRouter.get(
  "/consistency-report",
  requireAdmin,
  handle(async (_req, res) => res.json(await runConsistencyCheck())),
);
