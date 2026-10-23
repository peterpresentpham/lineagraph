import { Router } from "express";
import {
  ServiceError,
  createRelationType,
  createRelationship,
  deleteRelationType,
  deleteRelationship,
  findRelations,
  getRelationshipForEdit,
  listRelationTypes,
  listRelationships,
  relationTypeInput,
  relationshipInput,
  updateRelationType,
  updateRelationship,
} from "@lineagraph/core";
import { z } from "zod";
import { handle, intQuery, param, textQuery } from "../http.js";
import { requireAdmin } from "../middleware/auth.js";

// Relationships between people and polities.
// - GET /relations?a=&b=         public "how are these two related" search (design doc 7.7)
// - /relation-types              the vocabulary (public read, admin write)
// - /relationships               the stored facts (admin only)
export const relationsRouter = Router();

relationsRouter.get(
  "/relations",
  handle(async (req, res) => {
    const a = textQuery(req.query.a, "a");
    const b = textQuery(req.query.b, "b");
    if (!a || !b) {
      throw new ServiceError(400, "Cần chọn hai đối tượng (a và b)");
    }
    res.json(
      await findRelations(a, b, {
        includeDisputed: req.query.includeDisputed === "1",
        terms: req.query.terms === "neutral" ? "neutral" : "vi",
      }),
    );
  }),
);

relationsRouter.get(
  "/relation-types",
  handle(async (_req, res) => res.json(await listRelationTypes())),
);
relationsRouter.post(
  "/relation-types",
  requireAdmin,
  handle(async (req, res) => {
    await createRelationType(relationTypeInput.parse(req.body));
    res.status(201).end();
  }),
);
relationsRouter.put(
  "/relation-types/:code",
  requireAdmin,
  handle(async (req, res) => {
    const body = z
      .object({
        label: z.string().trim().min(1, "Nhãn không được để trống"),
        inverseLabel: z.string().trim().nullish(),
        category: z.string().trim().min(1).optional(),
        isAcyclic: z.boolean().optional(),
        defaultImportance: z.number().int().min(1).max(5).optional(),
      })
      .parse(req.body);
    await updateRelationType(param(req, "code"), body);
    res.status(204).end();
  }),
);
relationsRouter.delete(
  "/relation-types/:code",
  requireAdmin,
  handle(async (req, res) => {
    await deleteRelationType(param(req, "code"));
    res.status(204).end();
  }),
);

relationsRouter.use("/relationships", requireAdmin);
relationsRouter.get(
  "/relationships",
  handle(async (req, res) => {
    const q = req.query;
    res.json(
      await listRelationships({
        nodeId: typeof q.nodeId === "string" ? q.nodeId : undefined,
        type: typeof q.type === "string" ? q.type : undefined,
        q: typeof q.q === "string" ? q.q : undefined,
        limit: intQuery(q.limit, "limit"),
        offset: intQuery(q.offset, "offset"),
      }),
    );
  }),
);
relationsRouter.get(
  "/relationships/:id",
  handle(async (req, res) => res.json(await getRelationshipForEdit(param(req, "id")))),
);
relationsRouter.post(
  "/relationships",
  handle(async (req, res) => {
    res.status(201).json(await createRelationship(relationshipInput.parse(req.body)));
  }),
);
relationsRouter.put(
  "/relationships/:id",
  handle(async (req, res) => {
    await updateRelationship(param(req, "id"), relationshipInput.parse(req.body));
    res.status(204).end();
  }),
);
relationsRouter.delete(
  "/relationships/:id",
  handle(async (req, res) => {
    await deleteRelationship(param(req, "id"));
    res.status(204).end();
  }),
);
