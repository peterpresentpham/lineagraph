import { Router } from "express";
import { getTimeline, getTimelineIndex } from "@lineagraph/core";
import { handle, intQuery } from "../http.js";

export const timelineRouter = Router();

// How many entries begin in each century, so the page can offer a century picker without loading
// the entries themselves.
timelineRouter.get(
  "/timeline/centuries",
  handle(async (_req, res) => res.json(await getTimelineIndex())),
);

// The entries of one century (`?century=15`; negative for BCE: -5 is the 5th century BCE).
timelineRouter.get(
  "/timeline",
  handle(async (req, res) => {
    res.json(
      await getTimeline({
        century: intQuery(req.query.century, "century"),
        limit: intQuery(req.query.limit, "limit"),
      }),
    );
  }),
);
