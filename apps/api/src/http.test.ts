import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { personInput, ServiceError } from "@lineagraph/core";
import { errorHandler, handle, routeNotFound } from "./http.js";

// The error contract, tested without a database: a tiny app whose routes each fail in one way.
const fail = (error: unknown) =>
  handle(async () => {
    throw error;
  });
const pg = (code: string) => Object.assign(new Error(`pg ${code}`), { code });

const app = express();
app.use(express.json());
app.get("/service", fail(new ServiceError(404, "Không tìm thấy nhân vật")));
app.post(
  "/validate",
  handle(async (req) => personInput.parse(req.body)),
);
app.get("/bad-value", fail(pg("22P02")));
app.get("/referenced", fail(pg("23503")));
app.get("/exists", fail(pg("23505")));
app.get("/timeout", fail(pg("57014")));
app.get("/db-down", fail(pg("ECONNREFUSED")));
app.get(
  "/db-down-wrapped",
  fail(Object.assign(new Error("x"), { cause: { code: "CONNECT_TIMEOUT" } })),
);
app.get("/no-column", fail(pg("42703")));
app.get("/boom", fail(new Error("secret internal detail")));
app.use(routeNotFound);
app.use(errorHandler);

describe("error responses", () => {
  it("always carry a Vietnamese message and a stable code", async () => {
    const cases: [string, number, string][] = [
      ["/service", 404, "NOT_FOUND"],
      ["/bad-value", 400, "INVALID_VALUE"],
      ["/referenced", 409, "STILL_REFERENCED"],
      ["/exists", 409, "ALREADY_EXISTS"],
      ["/timeout", 503, "TIMEOUT"],
      ["/db-down", 503, "DATABASE_UNAVAILABLE"],
      ["/db-down-wrapped", 503, "DATABASE_UNAVAILABLE"],
      ["/boom", 500, "INTERNAL_ERROR"],
      ["/nowhere", 404, "ROUTE_NOT_FOUND"],
    ];
    for (const [path, status, code] of cases) {
      const res = await request(app).get(path);
      expect(res.status, path).toBe(status);
      expect(res.headers["content-type"], path).toMatch(/json/);
      expect(res.body.code, path).toBe(code);
      expect(typeof res.body.error, path).toBe("string");
      expect(res.headers["cache-control"], path).toBe("no-store");
    }
  });

  it("names the field and speaks Vietnamese when validation fails", async () => {
    const res = await request(app)
      .post("/validate")
      .send({ names: "x", sex: "alien", birth: { year: 1400, month: 13 } });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    const byPath = Object.fromEntries(
      res.body.issues.map((i: { path: string; message: string }) => [i.path, i.message]),
    );
    expect(byPath["names"]).toBe("Tên: sai kiểu dữ liệu, cần danh sách");
    expect(byPath["sex"]).toContain("Giới tính: không hợp lệ, chỉ nhận:");
    expect(byPath["birth.month"]).toBe("Tháng: giá trị tối đa là 12");
    expect(res.body.error).toMatch(/\(và 2 lỗi khác\)$/);
    expect(JSON.stringify(res.body)).not.toMatch(/Required|Expected|Invalid/);
  });

  it("rejects malformed JSON with its own code", async () => {
    const res = await request(app)
      .post("/validate")
      .set("content-type", "application/json")
      .send("{bad");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_JSON");
  });

  it("tells a developer what to do about a missing column, but only outside production", async () => {
    const dev = await request(app).get("/no-column");
    expect(dev.status).toBe(500);
    expect(dev.body.hint).toContain("pnpm db:migrate");
    expect(dev.body.detail).toBeDefined();

    const before = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const prod = await request(app).get("/boom");
      expect(prod.status).toBe(500);
      expect(prod.body.detail).toBeUndefined();
      expect(prod.body.hint).toBeUndefined();
      expect(JSON.stringify(prod.body)).not.toContain("secret internal detail");
    } finally {
      process.env.NODE_ENV = before;
    }
  });
});
