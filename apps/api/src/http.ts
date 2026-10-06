import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { ServiceError } from "@lineagraph/core";

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
export function intQuery(value: unknown, name: string): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(n)) throw new ServiceError(400, `Tham số ${name} phải là số nguyên`);
  return n;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
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
  // Postgres errors: 22P02 = malformed value (for example a non-UUID id), 23503 = foreign key
  // violation, 23505 = unique violation. = foreign key violation, 23505 = unique violation.
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
  console.error(err);
  res.status(500).json({ error: "Lỗi máy chủ" });
}
