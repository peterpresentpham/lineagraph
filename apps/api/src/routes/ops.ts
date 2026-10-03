import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";

// Consistency-check report (cycles, conflicting dates, orphaned citations — section 7.6)
// and triggers the bulk-import job (dry-run/--apply — section 11.2), which actually runs in apps/worker.
export const opsRouter = Router();
opsRouter.use(requireAdmin);

opsRouter.get("/consistency-report", (_req, res) => {
  res.status(501).json({ error: "not_implemented" });
});

opsRouter.post("/imports/run", (_req, res) => {
  res.status(501).json({ error: "not_implemented" });
});
