import type { RequestHandler } from "express";
import { recordAudit } from "@lineagraph/core";

// URL prefix -> the table the change log names. Registries and relation types are keyed by code,
// not by id, so they are not logged here.
const tables: Record<string, string> = {
  persons: "person",
  polities: "polity",
  tenures: "tenure",
  relationships: "relation",
  places: "place",
  sources: "source",
  citations: "citation",
};

const action = { POST: "create", PUT: "update", DELETE: "delete" } as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Logs every successful admin write (who, what, which row) to kg.audit_log. It runs after the
 * response has been sent and never fails the request: a logging problem is only printed.
 */
export const auditWrites: RequestHandler = (req, res, next) => {
  const kind = action[req.method as keyof typeof action];
  if (!kind) return next();

  // A create returns the new row's id in its body; capture it as the response goes out.
  let createdId: string | undefined;
  const json = res.json.bind(res);
  res.json = (body: unknown) => {
    const id = (body as { id?: unknown } | null)?.id;
    if (typeof id === "string") createdId = id;
    return json(body);
  };

  res.on("finish", () => {
    const admin = res.locals.admin as { id?: string } | undefined;
    const [, prefix, idInPath] = req.path.split("/");
    const tableName = tables[prefix ?? ""];
    const rowId = idInPath && uuid.test(idInPath) ? idInPath : createdId;
    if (res.statusCode >= 400 || !admin?.id || !tableName || !rowId) return;
    recordAudit({
      tableName,
      rowId,
      action: kind,
      actor: admin.id,
      after: kind === "delete" ? undefined : req.body,
    }).catch((err) => console.error("audit log failed", err));
  });
  next();
};
