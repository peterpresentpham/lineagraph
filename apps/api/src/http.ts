import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { ServiceError } from "@lineagraph/core";
import { errorFields, log } from "./logger.js";

// Express 4 does not catch rejected promises, so every async handler goes through this.
export const handle =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

/**
 * Lets browsers and proxies reuse a public read for a short while. Requests that carry an admin
 * token are never cached (the admin app must see its own edits at once), and errors never are.
 */
export const publicCache =
  (seconds: number): RequestHandler =>
  (req, res, next) => {
    res.vary("Authorization");
    if (req.method === "GET" && !req.header("authorization")) {
      res.setHeader("Cache-Control", `public, max-age=${seconds}`);
    }
    next();
  };

export const param = (req: Request, name: string) => String(req.params[name]);

/** Optional integer query value: absent -> undefined, anything that is not an integer -> 400. */
/** A page offset: an integer, and not so large that it makes the database skip millions of rows. */
export function offsetQuery(value: unknown): number | undefined {
  const n = intQuery(value, "offset");
  if (n !== undefined && (n < 0 || n > 100_000)) {
    throw new ServiceError(400, "Tham số offset ngoài phạm vi cho phép");
  }
  return n;
}

/** A search text or other free-form parameter, with a ceiling on its length. */
export function textQuery(value: unknown, name: string, max = 100): string | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  if (value.length > max)
    throw new ServiceError(400, `Tham số ${name} quá dài (tối đa ${max} ký tự)`);
  return value;
}

/** A query parameter that is a plain string (the first one if repeated), or undefined. */
export const strQuery = (value: unknown): string | undefined =>
  typeof value === "string" && value !== "" ? value : undefined;

/** A flag such as `?noSource=1`. */
export const flagQuery = (value: unknown): boolean => value === "1" || value === "true";

export function intQuery(value: unknown, name: string): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(n)) throw new ServiceError(400, `Tham số ${name} phải là số nguyên`);
  return n;
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  res.setHeader("Cache-Control", "no-store");
  if (err instanceof ServiceError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: err.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }
  // A body that is not valid JSON (thrown by express.json before any route runs).
  if ((err as { type?: string })?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Nội dung gửi lên không phải JSON hợp lệ" });
    return;
  }
  if ((err as { type?: string })?.type === "entity.too.large") {
    res.status(413).json({ error: "Nội dung gửi lên quá lớn" });
    return;
  }
  // Postgres errors: 22P02 = malformed value (for example a non-UUID id), 23503 = foreign key
  // violation, 23505 = unique violation, 57014 = the statement ran past statement_timeout.
  const code =
    (err as { code?: string; cause?: { code?: string } })?.code ??
    (err as { cause?: { code?: string } })?.cause?.code;
  if (code === "22P02") {
    res.status(400).json({ error: "Mã định danh hoặc giá trị không hợp lệ" });
    return;
  }
  if (code === "23503") {
    res
      .status(409)
      .json({ error: "Không thể xoá hoặc lưu vì còn dữ liệu khác đang liên kết tới mục này" });
    return;
  }
  if (code === "23505") {
    res.status(409).json({ error: "Dữ liệu này đã tồn tại" });
    return;
  }
  if (code === "57014") {
    log("error", "statement timeout", { reqId: res.locals.reqId, path: req.path });
    res.status(503).json({ error: "Yêu cầu mất quá nhiều thời gian, vui lòng thử lại" });
    return;
  }
  // The id lets a report ("lỗi lúc 10:42, mã ...") be traced to this exact stack in the logs.
  log("error", "unhandled error", {
    reqId: res.locals.reqId,
    method: req.method,
    path: req.path,
    ...errorFields(err),
  });
  res.status(500).json({ error: "Lỗi máy chủ", requestId: res.locals.reqId });
}
