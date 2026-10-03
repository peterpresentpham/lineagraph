import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { ServiceError } from "@lineagraph/core";

// Express 4 does not catch rejected promises, so every async handler goes through this.
export const handle =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

export const param = (req: Request, name: string) => String(req.params[name]);

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
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
  // Postgres errors: 23503 = foreign key violation, 23505 = unique violation.
  const code =
    (err as { code?: string; cause?: { code?: string } })?.code ??
    (err as { cause?: { code?: string } })?.cause?.code;
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
