import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";

// Review queue draft -> proposed -> approved/rejected. Only approved facts feed into
// learning — section 11.2.
export const reviewRouter = Router();
reviewRouter.use(requireAdmin);

reviewRouter.get("/review-queue", (_req, res) => {
  res.status(501).json({ error: "not_implemented" });
});

reviewRouter.post("/review-queue/:id/approve", (req, res) => {
  res.status(501).json({ error: "not_implemented", id: req.params.id });
});

reviewRouter.post("/review-queue/:id/reject", (req, res) => {
  res.status(501).json({ error: "not_implemented", id: req.params.id });
});
