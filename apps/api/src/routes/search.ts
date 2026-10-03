import { Router } from "express";
import { search } from "@lineagraph/core";
import { handle } from "../http.js";

export const searchRouter = Router();

searchRouter.get(
  "/search",
  handle(async (req, res) => {
    res.json(await search(typeof req.query.q === "string" ? req.query.q : ""));
  }),
);
