import { Router } from "express";
import {
  createRegistryItem, deleteRegistryItem, listRegistry, registryInput, registryTables, updateRegistryLabel,
} from "@lineagraph/core";
import { z } from "zod";
import { handle, param } from "../http.js";
import { requireAdmin } from "../middleware/auth.js";

// A generic API for every registry table (office_type, name_kind, ...) used instead of ENUM —
// new values are added with INSERT, no migration needed. Reads are public (forms and the web
// app need the Vietnamese labels); writes need an admin token.
export const registryRouter = Router();

registryRouter.get("/registries", (_req, res) => res.json(registryTables));
registryRouter.get("/registries/:table", handle(async (req, res) => res.json(await listRegistry(param(req, "table")))));

registryRouter.post("/registries/:table", requireAdmin, handle(async (req, res) => {
  await createRegistryItem(param(req, "table"), registryInput.parse(req.body));
  res.status(201).end();
}));
registryRouter.put("/registries/:table/:code", requireAdmin, handle(async (req, res) => {
  const { label } = z.object({ label: z.string().trim().min(1) }).parse(req.body);
  await updateRegistryLabel(param(req, "table"), param(req, "code"), label);
  res.status(204).end();
}));
registryRouter.delete("/registries/:table/:code", requireAdmin, handle(async (req, res) => {
  await deleteRegistryItem(param(req, "table"), param(req, "code"));
  res.status(204).end();
}));
