import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";

// Content CRUD — called only by the admin app, always behind requireAdmin. Section 3
// (pages 3-7) of thiet-ke-ui-va-kien-truc-service.md.
export const contentRouter = Router();
contentRouter.use(requireAdmin);

const resources = ["persons", "polities", "tenures", "parentage", "unions", "relations-admin"];

for (const resource of resources) {
  contentRouter.post(`/${resource}`, (_req, res) => {
    res.status(501).json({ error: "not_implemented", resource });
  });
  contentRouter.put(`/${resource}/:id`, (req, res) => {
    res.status(501).json({ error: "not_implemented", resource, id: req.params.id });
  });
  contentRouter.delete(`/${resource}/:id`, (req, res) => {
    res.status(501).json({ error: "not_implemented", resource, id: req.params.id });
  });
}
