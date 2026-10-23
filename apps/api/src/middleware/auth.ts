import { getAdminSession } from "@lineagraph/core";
import type { NextFunction, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { sendError } from "../http.js";

const secretValue = process.env.JWT_SECRET;
if (!secretValue) throw new Error("JWT_SECRET is not set");
if (secretValue.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
const secret = new TextEncoder().encode(secretValue);

/** A token is good for this long; the admin app renews it while someone is working. */
export const TOKEN_TTL_SECONDS = 30 * 60;

/** `version` is the account's token version; raising it in the database revokes this token. */
export async function signAdminToken(adminId: string, email: string, version: number) {
  return new SignJWT({ email, ver: version })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

// Guards every write route. Read routes for the public web app never use this.
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  // Responses to unauthenticated requests must never be reused from a cache.
  res.setHeader("Cache-Control", "no-store");
  if (!token) {
    sendError(res, 401, "Cần đăng nhập để thực hiện thao tác này", { code: "LOGIN_REQUIRED" });
    return;
  }
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    const session = payload.sub ? await getAdminSession(payload.sub) : null;
    // The account must still exist and the token must carry its current version.
    if (!payload.sub || !session || payload.ver !== session.tokenVersion) {
      throw new Error("session ended");
    }
    res.locals.admin = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    // An expired token is the everyday case; anything else (bad signature, account gone, token
    // revoked by a logout elsewhere) needs a fresh login just the same.
    const expired = (err as { code?: string })?.code === "ERR_JWT_EXPIRED";
    sendError(
      res,
      401,
      expired
        ? "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"
        : "Phiên đăng nhập không còn hiệu lực, vui lòng đăng nhập lại",
      { code: expired ? "SESSION_EXPIRED" : "SESSION_INVALID" },
    );
  }
}
