import type { NextFunction, Request, Response } from "express";

// Only the admin app needs a token; every read route for the user app skips this middleware.
// See section 4 (API modules) of thiet-ke-ui-va-kien-truc-service.md.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.header("authorization");
  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}
