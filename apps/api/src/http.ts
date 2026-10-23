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

/** Optional integer query value: absent -> undefined, anything that is not an integer -> 400. */
export function intQuery(value: unknown, name: string): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(n)) throw new ServiceError(400, `Tham số ${name} phải là số nguyên`);
  return n;
}

/**
 * Every error the API sends has this shape:
 * - `error`: a sentence in Vietnamese, safe to show to a person as it is;
 * - `code`: a stable identifier for programs to branch on (never translated, never reworded);
 * - `requestId`: the same id as the `x-request-id` header and the server log line;
 * - `issues`: for validation failures, one entry per field (`path`, `message`);
 * - `hint` and `detail`: for developers, only outside production.
 */
export type ErrorBody = {
  error: string;
  code: string;
  requestId?: string;
  issues?: { path: string; message: string }[];
  retryAfterSeconds?: number;
  hint?: string;
  detail?: string;
};

/** The code that goes with a status when the thrower did not pick a more specific one. */
export function codeForStatus(status: number): string {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHENTICATED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 413:
      return "PAYLOAD_TOO_LARGE";
    case 429:
      return "RATE_LIMITED";
    case 503:
      return "UNAVAILABLE";
    default:
      return status >= 500 ? "INTERNAL_ERROR" : "ERROR";
  }
}

const isProduction = () => process.env.NODE_ENV === "production";

/** Sends an error in the standard shape; the request id is always filled in. */
export function sendError(
  res: Response,
  status: number,
  message: string,
  extra: Partial<Omit<ErrorBody, "error" | "requestId">> = {},
) {
  const body: ErrorBody = {
    error: message,
    code: extra.code ?? codeForStatus(status),
    ...extra,
    requestId: res.locals.reqId,
  };
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}

/** Unknown routes answer in JSON like everything else, instead of Express's HTML page. */
export function routeNotFound(req: Request, res: Response) {
  sendError(res, 404, `Không có đường dẫn ${req.method} ${req.path}`, { code: "ROUTE_NOT_FOUND" });
}

// Postgres (and the driver) say what went wrong through `code`; this turns the ones that are the
// caller's fault, or a temporary outage, into an honest status instead of a bare 500.
const BAD_INPUT: Record<string, string> = {
  "22P02": "Mã định danh hoặc giá trị không hợp lệ",
  "22021": "Giá trị chứa ký tự không hợp lệ",
  "22003": "Một con số nằm ngoài phạm vi cho phép",
  "22007": "Ngày không hợp lệ",
  "22008": "Ngày nằm ngoài phạm vi cho phép",
  "23514": "Một giá trị vi phạm ràng buộc dữ liệu (ví dụ ngoài khoảng cho phép)",
};
const DB_DOWN = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "CONNECT_TIMEOUT",
  "CONNECTION_CLOSED",
  "CONNECTION_ENDED",
  "CONNECTION_DESTROYED",
  "57P01", // admin shutdown
  "57P03", // cannot connect now (starting up)
  "53300", // too many connections
]);
// 42P01/42703 mean the code expects a table or column the database does not have: migrations
// were not applied. The visitor cannot fix that, but the developer reading the response can.
const SCHEMA_MISMATCH = new Set(["42P01", "42703"]);

function dbCode(err: unknown): string | undefined {
  const e = err as { code?: unknown; cause?: { code?: unknown } } | null;
  const code = e?.code ?? e?.cause?.code;
  return typeof code === "string" ? code : undefined;
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = res.locals.reqId;
  if (err instanceof ServiceError) {
    sendError(res, err.status, err.message);
    return;
  }
  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    const first = issues[0]?.message ?? "Dữ liệu không hợp lệ";
    const more = issues.length > 1 ? ` (và ${issues.length - 1} lỗi khác)` : "";
    sendError(res, 400, `${first}${more}`, { code: "VALIDATION_FAILED", issues });
    return;
  }
  // Thrown by express.json before any route runs.
  const type = (err as { type?: string } | null)?.type;
  if (type === "entity.parse.failed") {
    sendError(res, 400, "Nội dung gửi lên không phải JSON hợp lệ", { code: "INVALID_JSON" });
    return;
  }
  if (type === "entity.too.large") {
    sendError(res, 413, "Nội dung gửi lên quá lớn");
    return;
  }
  const code = dbCode(err);
  if (code && BAD_INPUT[code]) {
    sendError(res, 400, BAD_INPUT[code]!, { code: "INVALID_VALUE" });
    return;
  }
  if (code === "23503") {
    sendError(res, 409, "Không thể xoá hoặc lưu vì còn dữ liệu khác đang liên kết tới mục này", {
      code: "STILL_REFERENCED",
    });
    return;
  }
  if (code === "23505") {
    sendError(res, 409, "Dữ liệu này đã tồn tại", { code: "ALREADY_EXISTS" });
    return;
  }
  if (code === "57014") {
    log("error", "statement timeout", { reqId: requestId, path: req.path });
    sendError(res, 503, "Yêu cầu mất quá nhiều thời gian, vui lòng thử lại", { code: "TIMEOUT" });
    return;
  }
  if (code && DB_DOWN.has(code)) {
    log("error", "database unavailable", { reqId: requestId, path: req.path, dbCode: code });
    sendError(
      res,
      503,
      "Hệ thống đang bận hoặc tạm mất kết nối dữ liệu, vui lòng thử lại sau ít phút",
      {
        code: "DATABASE_UNAVAILABLE",
      },
    );
    return;
  }
  // The id lets a report ("lỗi lúc 10:42, mã ...") be traced to this exact stack in the logs.
  log("error", "unhandled error", {
    reqId: requestId,
    method: req.method,
    path: req.path,
    ...errorFields(err),
  });
  const dev: Partial<ErrorBody> = isProduction()
    ? {}
    : {
        detail: err instanceof Error ? err.message : String(err),
        ...(code && SCHEMA_MISMATCH.has(code)
          ? { hint: "Cơ sở dữ liệu thiếu bảng hoặc cột: chạy `pnpm db:migrate` rồi thử lại." }
          : {}),
      };
  sendError(
    res,
    500,
    "Lỗi máy chủ, vui lòng thử lại sau. Nếu lỗi lặp lại, hãy báo kèm mã yêu cầu.",
    {
      code: "INTERNAL_ERROR",
      ...dev,
    },
  );
}
