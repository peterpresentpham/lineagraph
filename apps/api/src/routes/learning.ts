import { Router } from "express";

// Spaced repetition (SM-2/FSRS) and progress — design doc section 8. Questions are built on
// demand from approved facts (buildQuestions in @lineagraph/core), not by a background job.
export const learningRouter = Router();

learningRouter.get("/review/today", (_req, res) => {
  res.status(501).json({ error: "not_implemented" });
});

learningRouter.post("/review/:cardId/answer", (req, res) => {
  res.status(501).json({ error: "not_implemented", cardId: req.params.cardId });
});

learningRouter.get("/progress", (_req, res) => {
  res.status(501).json({ error: "not_implemented" });
});
