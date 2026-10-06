import { Router } from "express";
import {
  createPlace,
  deletePlace,
  getPlace,
  listPlaces,
  placeInput,
  updatePlace,
} from "@lineagraph/core";
import { handle, intQuery, param } from "../http.js";
import { requireAdmin } from "../middleware/auth.js";

// Places (where people were born or died): public read, admin-only write.
export const placesRouter = Router();

placesRouter.get(
  "/places",
  handle(async (req, res) => {
    res.json(
      await listPlaces({
        q: typeof req.query.q === "string" ? req.query.q : undefined,
        limit: intQuery(req.query.limit, "limit"),
        offset: intQuery(req.query.offset, "offset"),
      }),
    );
  }),
);

placesRouter.get(
  "/places/:id",
  handle(async (req, res) => res.json(await getPlace(param(req, "id")))),
);

placesRouter.post(
  "/places",
  requireAdmin,
  handle(async (req, res) => res.status(201).json(await createPlace(placeInput.parse(req.body)))),
);

placesRouter.put(
  "/places/:id",
  requireAdmin,
  handle(async (req, res) => {
    await updatePlace(param(req, "id"), placeInput.parse(req.body));
    res.status(204).end();
  }),
);

placesRouter.delete(
  "/places/:id",
  requireAdmin,
  handle(async (req, res) => {
    await deletePlace(param(req, "id"));
    res.status(204).end();
  }),
);
