import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

// One JSON object per line on stdout (stderr for errors), so the host's log search can filter on
// any field. No query strings and no request bodies are ever logged.

type Fields = Record<string, unknown>;

export function log(level: "info" | "warn" | "error", message: string, fields: Fields = {}) {
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...fields });
  (level === "error" ? console.error : console.log)(line);
}

export function errorFields(err: unknown): Fields {
  return err instanceof Error ? { error: err.message, stack: err.stack } : { error: String(err) };
}

/** Gives every request an id (returned in `x-request-id`) and logs it once it has finished. */
export const requestLogger: RequestHandler = (req, res, next) => {
  const reqId = randomUUID();
  res.locals.reqId = reqId;
  res.setHeader("x-request-id", reqId);
  const start = Date.now();
  res.on("finish", () => {
    if (req.path === "/health" || req.path === "/health/live") return;
    const admin = res.locals.admin as { id?: string } | undefined;
    log(res.statusCode >= 500 ? "error" : "info", "request", {
      reqId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - start,
      ...(admin?.id ? { admin: admin.id } : {}),
    });
  });
  next();
};
