import rateLimit from "express-rate-limit";

const tooMany = { error: "Quá nhiều yêu cầu, vui lòng thử lại sau" };

/** Ceiling for every route; the heavier public routes also get {@link heavyLimiter}. */
export const globalLimiter = () =>
  rateLimit({
    windowMs: 60_000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === "/health" || req.path === "/health/live",
    message: tooMany,
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
    message: tooMany,
  });
