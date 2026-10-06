import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

const good = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://u:p@db.example.com/app",
  JWT_SECRET: "a-long-random-secret-with-more-than-32-characters",
  TRUST_PROXY: "1",
  WEB_ORIGIN: "https://suPha.example.com",
  ADMIN_ORIGIN: "https://admin.example.com",
};

describe("loadConfig", () => {
  it("accepts a complete production environment", () => {
    const c = loadConfig(good);
    expect(c.production).toBe(true);
    expect(c.corsOrigins).toEqual([good.WEB_ORIGIN, good.ADMIN_ORIGIN]);
    expect(c.trustProxy).toBe(1);
  });

  it("uses local defaults outside production", () => {
    const c = loadConfig({});
    expect(c.production).toBe(false);
    expect(c.corsOrigins[0]).toContain("localhost");
  });

  it.each([
    ["DATABASE_URL", { DATABASE_URL: undefined }],
    ["JWT_SECRET", { JWT_SECRET: "short" }],
    ["JWT_SECRET", { JWT_SECRET: "change-me-to-a-long-random-string-of-32-chars-or-more" }],
    ["TRUST_PROXY", { TRUST_PROXY: undefined }],
    ["WEB_ORIGIN", { WEB_ORIGIN: undefined }],
    ["WEB_ORIGIN", { WEB_ORIGIN: "http://localhost:3200" }],
    ["ADMIN_ORIGIN", { ADMIN_ORIGIN: "https://admin.example.com/" }],
  ])("refuses a production start with a bad %s", (name, patch) => {
    expect(() => loadConfig({ ...good, ...patch })).toThrow(new RegExp(name));
  });

  it("lists every problem at once", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow(
      /DATABASE_URL[\s\S]*JWT_SECRET[\s\S]*TRUST_PROXY[\s\S]*WEB_ORIGIN[\s\S]*ADMIN_ORIGIN/,
    );
  });

  it("allows localhost origins only when explicitly asked to", () => {
    const local = { ...good, WEB_ORIGIN: "http://localhost:3200", ALLOW_LOCALHOST: "1" };
    expect(loadConfig(local).corsOrigins[0]).toBe("http://localhost:3200");
  });
});
