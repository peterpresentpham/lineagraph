import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";

// A generic UI/API for every registry table (relation_type, office_type, name_kind, ...)
// used instead of ENUM — new values are added with INSERT, no migration needed. Sections 5.1.3, 10 (admin pages).
export const registryRouter = Router();
registryRouter.use(requireAdmin);

registryRouter.get("/registries/:table", (req, res) => {
  res.status(501).json({ error: "not_implemented", table: req.params.table });
});

registryRouter.post("/registries/:table", (req, res) => {
  res.status(501).json({ error: "not_implemented", table: req.params.table });
});
