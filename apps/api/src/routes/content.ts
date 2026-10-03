import { Router } from "express";
import {
  createPerson,
  createPolity,
  createTenure,
  deletePerson,
  deletePolity,
  deleteTenure,
  getPersonForEdit,
  getPolityForEdit,
  getTenureForEdit,
  listTenures,
  personInput,
  polityInput,
  tenureInput,
  updatePerson,
  updatePolity,
  updateTenure,
} from "@lineagraph/core";
import { handle, param } from "../http.js";
import { requireAdmin } from "../middleware/auth.js";

// Content CRUD for the admin app. Every route here needs a valid admin token.
export const contentRouter = Router();
contentRouter.use(["/persons", "/polities", "/tenures"], (req, res, next) => {
  // Public reads (list/detail) are served by graphRouter, which is mounted first.
  requireAdmin(req, res, next);
});

contentRouter.get(
  "/persons/:id/edit",
  handle(async (req, res) => res.json(await getPersonForEdit(param(req, "id")))),
);
contentRouter.post(
  "/persons",
  handle(async (req, res) => res.status(201).json(await createPerson(personInput.parse(req.body)))),
);
contentRouter.put(
  "/persons/:id",
  handle(async (req, res) => {
    await updatePerson(param(req, "id"), personInput.parse(req.body));
    res.status(204).end();
  }),
);
contentRouter.delete(
  "/persons/:id",
  handle(async (req, res) => {
    await deletePerson(param(req, "id"));
    res.status(204).end();
  }),
);

contentRouter.get(
  "/polities/:id/edit",
  handle(async (req, res) => res.json(await getPolityForEdit(param(req, "id")))),
);
contentRouter.post(
  "/polities",
  handle(async (req, res) => res.status(201).json(await createPolity(polityInput.parse(req.body)))),
);
contentRouter.put(
  "/polities/:id",
  handle(async (req, res) => {
    await updatePolity(param(req, "id"), polityInput.parse(req.body));
    res.status(204).end();
  }),
);
contentRouter.delete(
  "/polities/:id",
  handle(async (req, res) => {
    await deletePolity(param(req, "id"));
    res.status(204).end();
  }),
);

contentRouter.get(
  "/tenures",
  handle(async (req, res) => {
    res.json(
      await listTenures({
        personId: typeof req.query.personId === "string" ? req.query.personId : undefined,
        polityId: typeof req.query.polityId === "string" ? req.query.polityId : undefined,
      }),
    );
  }),
);
contentRouter.get(
  "/tenures/:id",
  handle(async (req, res) => res.json(await getTenureForEdit(param(req, "id")))),
);
contentRouter.post(
  "/tenures",
  handle(async (req, res) => res.status(201).json(await createTenure(tenureInput.parse(req.body)))),
);
contentRouter.put(
  "/tenures/:id",
  handle(async (req, res) => {
    await updateTenure(param(req, "id"), tenureInput.parse(req.body));
    res.status(204).end();
  }),
);
contentRouter.delete(
  "/tenures/:id",
  handle(async (req, res) => {
    await deleteTenure(param(req, "id"));
    res.status(204).end();
  }),
);
