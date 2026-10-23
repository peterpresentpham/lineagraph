import rateLimit, { type Options } from "express-rate-limit";
import { sendError } from "../http.js";

/** The standard 429: says how long to wait, so a client can back off instead of guessing. */
export const tooManyRequests =
  (message: string): Options["handler"] =>
  (req, res) => {
    const resetTime = (req as { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime;
    const retryAfterSeconds = resetTime
      ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
      : undefined;
    sendError(res, 429, message, { code: "RATE_LIMITED", retryAfterSeconds });
  };

const tooMany = tooManyRequests("Bạn gửi quá nhiều yêu cầu, vui lòng đợi một chút rồi thử lại");

/** Ceiling for every route; the heavier public routes also get {@link heavyLimiter}. */
export const globalLimiter = () =>
  rateLimit({
    windowMs: 60_000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === "/health" || req.path === "/health/live",
    handler: tooMany,
  });

/**
 * Stricter, per client: search, relationship finding, graph building and the timeline each cost
 * the database real work, so a script hammering them is stopped long before the global ceiling.
 */
export const heavyLimiter = (limit = 60) =>
  rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: tooMany,
  });
