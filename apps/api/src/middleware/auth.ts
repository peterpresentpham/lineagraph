import type { NextFunction, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { adminExists } from "@lineagraph/core";

const secretValue = process.env.JWT_SECRET;
if (!secretValue) throw new Error("JWT_SECRET is not set");
if (secretValue.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
const secret = new TextEncoder().encode(secretValue);

export async function signAdminToken(adminId: string, email: string) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

// Guards every write route. Read routes for the public web app never use this.
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  // Responses to unauthenticated requests must never be reused from a cache.
  res.setHeader("Cache-Control", "no-store");
  if (!token) {
    res.status(401).json({ error: "Cần đăng nhập" });
    return;
  }
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (!payload.sub || !(await adminExists(payload.sub))) throw new Error("admin removed");
    res.locals.admin = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: "Phiên đăng nhập đã hết hạn" });
  }
}
