import type { RequestHandler } from "express";
import { recordAudit } from "@lineagraph/core";
import { errorFields, log } from "../logger.js";

// URL prefix -> the table the change log names. Registries and relation types are keyed by code,
// not by id, so they are not logged here.
const tables: Record<string, string> = {
  persons: "person",
  polities: "polity",
  tenures: "tenure",
  relationships: "relation",
  places: "place",
  events: "event",
  sources: "source",
  citations: "citation",
};

const action = { POST: "create", PUT: "update", DELETE: "delete" } as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Fields that must never reach the change log, however deep in the body they are.
const SECRET_KEY = /password|token|secret|authorization/i;

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SECRET_KEY.test(k) ? "[redacted]" : redact(v)]),
    );
  }
  return value;
}

/**
 * Logs every successful admin write (who, what, which row) to kg.audit_log. It runs after the
 * response has been sent and never fails the request: a logging problem is only printed.
 */
export const auditWrites: RequestHandler = (req, res, next) => {
  const method = action[req.method as keyof typeof action];
  if (!method) return next();
  // POST /persons/:id/restore undoes a delete; it is not a create.
  const kind = method === "create" && req.path.endsWith("/restore") ? "restore" : method;

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
      after: kind === "delete" ? undefined : redact(req.body),
    }).catch((err) => log("error", "audit log failed", errorFields(err)));
  });
  next();
};
