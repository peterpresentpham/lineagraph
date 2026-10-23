import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { findAdminByEmail, getAdminSession, revokeAdminSessions } from "@lineagraph/core";
import { handle, sendError } from "../http.js";
import { tooManyRequests } from "../middleware/limits.js";
import { log } from "../logger.js";
import { TOKEN_TTL_SECONDS, requireAdmin, signAdminToken } from "../middleware/auth.js";

const loginInput = z.object({
  email: z.string().trim().toLowerCase().email("Email không hợp lệ").max(200),
  password: z.string().min(1, "Nhập mật khẩu").max(200),
});

// Same message for unknown email and wrong password, so the response never reveals which emails exist.
const badCredentials = (res: Response) =>
  sendError(res, 401, "Email hoặc mật khẩu không đúng", { code: "INVALID_CREDENTIALS" });
// Compared against when the email is unknown, so timing does not reveal it either.
const dummyHash = bcrypt.hashSync("dummy-password", 12);

const tooManyAttempts = tooManyRequests("Thử đăng nhập quá nhiều lần, vui lòng đợi 15 phút");
const WINDOW_MS = 15 * 60 * 1000;

// Only a rejected login (401) counts against the limits: a server fault (500) or a malformed
// request is not a guess, and must not lock the real admin out while the fault is being fixed.
const wasNotRejected = (_req: unknown, res: { statusCode: number }) => res.statusCode !== 401;

/**
 * Login attempts are limited twice: per client address, and per account. The second stops a
 * botnet (many addresses) from guessing one admin's password; the first stops one address from
 * trying many accounts. Only failed attempts count, so a successful login never locks anyone out.
 * Built per app, so every app instance (and every test) starts with empty counters.
 */
export function createAuthRouter(limits: { perIp?: number; perEmail?: number } = {}) {
  const router = Router();

  const byIp = rateLimit({
    windowMs: WINDOW_MS,
    limit: limits.perIp ?? 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    requestWasSuccessful: wasNotRejected,
    handler: tooManyAttempts,
  });
  const byEmail = rateLimit({
    windowMs: WINDOW_MS,
    limit: limits.perEmail ?? 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    requestWasSuccessful: wasNotRejected,
    handler: tooManyAttempts,
    // A malformed body falls back to one shared key, so it cannot be used to dodge the limit.
    keyGenerator: (req) =>
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "no-email",
    validate: { keyGeneratorIpFallback: false },
  });

  router.post(
    "/auth/login",
    byIp,
    byEmail,
    handle(async (req, res) => {
      const { email, password } = loginInput.parse(req.body);
      const account = await findAdminByEmail(email);
      const ok = await bcrypt.compare(password, account?.passwordHash ?? dummyHash);
      if (!account || !ok) {
        log("warn", "failed login", { reqId: res.locals.reqId, ip: req.ip });
        badCredentials(res);
        return;
      }
      res.json({
        token: await signAdminToken(account.id, account.email, account.tokenVersion),
        email: account.email,
        expiresIn: TOKEN_TTL_SECONDS,
      });
    }),
  );

  // A new token for a still-valid one: the admin app calls this while someone is working, so a
  // short-lived token does not log them out mid-edit.
  router.post(
    "/auth/refresh",
    requireAdmin,
    handle(async (_req, res) => {
      const { id, email } = res.locals.admin as { id: string; email: string };
      const session = await getAdminSession(id);
      res.json({
        token: await signAdminToken(id, email, session!.tokenVersion),
        email,
        expiresIn: TOKEN_TTL_SECONDS,
      });
    }),
  );

  // Ends every session of this account, on every device, not only the one that asked.
  router.post(
    "/auth/logout",
    requireAdmin,
    handle(async (_req, res) => {
      await revokeAdminSessions((res.locals.admin as { id: string }).id);
      res.status(204).end();
    }),
  );

  router.get("/auth/me", requireAdmin, (_req, res) => {
    res.json({ email: res.locals.admin.email });
  });

  return router;
}
