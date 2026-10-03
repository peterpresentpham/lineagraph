import { Router } from "express";

// Diacritic-insensitive name search, matching every name variant (given name, style name,
// temple name...) — design doc section 10.3.
export const searchRouter = Router();

searchRouter.get("/search", (req, res) => {
  res.status(501).json({ error: "not_implemented", q: req.query.q });
});
