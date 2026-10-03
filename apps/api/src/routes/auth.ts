import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { findAdminByEmail } from "@lineagraph/core";
import { handle } from "../http.js";
import { requireAdmin, signAdminToken } from "../middleware/auth.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Thử đăng nhập quá nhiều lần, vui lòng đợi 15 phút" },
});

const loginInput = z.object({
  email: z.string().trim().toLowerCase().email("Email không hợp lệ"),
  password: z.string().min(1, "Nhập mật khẩu"),
});

// Same message for unknown email and wrong password, so the response never reveals which emails exist.
const badCredentials = { error: "Email hoặc mật khẩu không đúng" };
// Compared against when the email is unknown, so timing does not reveal it either.
const dummyHash = bcrypt.hashSync("dummy-password", 12);

authRouter.post(
  "/auth/login",
  loginLimiter,
  handle(async (req, res) => {
    const { email, password } = loginInput.parse(req.body);
    const account = await findAdminByEmail(email);
    const ok = await bcrypt.compare(password, account?.passwordHash ?? dummyHash);
    if (!account || !ok) {
      res.status(401).json(badCredentials);
      return;
    }
    res.json({ token: await signAdminToken(account.id, account.email), email: account.email });
  }),
);

authRouter.get("/auth/me", requireAdmin, (_req, res) => {
  res.json({ email: res.locals.admin.email });
});
