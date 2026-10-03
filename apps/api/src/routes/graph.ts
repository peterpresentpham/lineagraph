import { Router } from "express";

// Public reads: person, polity, neighbors, ancestors/descendants, LCA.
// Algorithms reference design doc sections 7.1-7.3.
export const graphRouter = Router();

graphRouter.get("/persons/:slug", (req, res) => {
  res.status(501).json({ error: "not_implemented", slug: req.params.slug });
});

graphRouter.get("/polities/:slug", (req, res) => {
  res.status(501).json({ error: "not_implemented", slug: req.params.slug });
});

graphRouter.get("/neighbors", (req, res) => {
  res.status(501).json({ error: "not_implemented" });
});

graphRouter.get("/ancestors", (req, res) => {
  res.status(501).json({ error: "not_implemented" });
});

graphRouter.get("/lca", (req, res) => {
  res.status(501).json({ error: "not_implemented" });
});
