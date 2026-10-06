import { Router } from "express";
import {
  createEvent,
  deleteEvent,
  eventInput,
  getEvent,
  getEventForEdit,
  listEvents,
  restoreNode,
  updateEvent,
} from "@lineagraph/core";
import { flagQuery, handle, intQuery, param, offsetQuery } from "../http.js";
import { requireAdmin } from "../middleware/auth.js";

// Events (battles, treaties, coronations...): public read, admin-only write.
export const eventsRouter = Router();

eventsRouter.get(
  "/events",
  handle(async (req, res) => {
    res.json(
      await listEvents({
        q: typeof req.query.q === "string" ? req.query.q : undefined,
        type: typeof req.query.type === "string" ? req.query.type : undefined,
        nodeId: typeof req.query.node === "string" ? req.query.node : undefined,
        noSource: flagQuery(req.query.noSource),
        sort: req.query.sort === "name" ? "name" : "date",
        limit: intQuery(req.query.limit, "limit"),
        offset: offsetQuery(req.query.offset),
      }),
    );
  }),
);

eventsRouter.get(
  "/events/:id/edit",
  requireAdmin,
  handle(async (req, res) => res.json(await getEventForEdit(param(req, "id")))),
);

eventsRouter.get(
  "/events/:id",
  handle(async (req, res) => res.json(await getEvent(param(req, "id")))),
);

eventsRouter.post(
  "/events",
  requireAdmin,
  handle(async (req, res) => res.status(201).json(await createEvent(eventInput.parse(req.body)))),
);

eventsRouter.put(
  "/events/:id",
  requireAdmin,
  handle(async (req, res) => {
    await updateEvent(param(req, "id"), eventInput.parse(req.body));
    res.status(204).end();
  }),
);

eventsRouter.delete(
  "/events/:id",
  requireAdmin,
  handle(async (req, res) => {
    await deleteEvent(param(req, "id"));
    res.status(204).end();
  }),
);

eventsRouter.post(
  "/events/:id/restore",
  requireAdmin,
  handle(async (req, res) => {
    await restoreNode(param(req, "id"), "event");
    res.status(204).end();
  }),
);
