import { Router } from "express";

// Timeline: the sovereign chain stays separate from other offices, and parallel polities
// can be drawn — sections 9.1.3, 5.11.C.
export const timelineRouter = Router();

timelineRouter.get("/timeline", (req, res) => {
  res.status(501).json({ error: "not_implemented", polity: req.query.polity });
});
