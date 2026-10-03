import { Router } from "express";
import { getTimeline } from "@lineagraph/core";
import { handle } from "../http.js";

export const timelineRouter = Router();

timelineRouter.get("/timeline", handle(async (_req, res) => res.json(await getTimeline())));
