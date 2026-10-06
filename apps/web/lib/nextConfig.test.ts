import { afterEach, beforeEach, describe, expect, it } from "vitest";
import config from "../next.config";

const BUILD = "phase-production-build";
const SERVER = "phase-production-server";
const DEV = "phase-development-server";
const NAMES = ["NEXT_PUBLIC_API_URL", "SITE_URL", "API_URL", "ALLOW_LOCALHOST"];

let saved: Record<string, string | undefined>;
beforeEach(() => {
  saved = Object.fromEntries(NAMES.map((n) => [n, process.env[n]]));
  for (const n of NAMES) delete process.env[n];
});
afterEach(() => {
  for (const n of NAMES) {
    if (saved[n] === undefined) delete process.env[n];
    else process.env[n] = saved[n];
  }
});

const production = () => {
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
  process.env.SITE_URL = "https://www.example.com";
  process.env.API_URL = "http://api.railway.internal:4200";
};

describe("production configuration", () => {
  it("refuses a build whose public addresses are not set", () => {
    expect(() => config(BUILD)).toThrow(/NEXT_PUBLIC_API_URL is not set[\s\S]*SITE_URL is not set/);
  });

  it("refuses addresses that point at localhost", () => {
    production();
    process.env.SITE_URL = "http://localhost:3200";
    expect(() => config(BUILD)).toThrow(/SITE_URL points at localhost/);
  });

  it("does not need API_URL to build, only to serve", () => {
    production();
    delete process.env.API_URL;
    expect(() => config(BUILD)).not.toThrow();
    expect(() => config(SERVER)).toThrow(/API_URL is not set/);
  });

  it("accepts a complete configuration and sends the security headers", async () => {
    production();
    const cfg = config(SERVER);
    const rules = await cfg.headers!();
    const values = Object.fromEntries(rules[0]!.headers.map((h) => [h.key, h.value]));
    expect(values["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(values["Content-Security-Policy"]).toContain(
      "connect-src 'self' https://api.example.com",
    );
    expect(values["Content-Security-Policy"]).toContain("upgrade-insecure-requests");
    expect(values["Strict-Transport-Security"]).toContain("max-age=");
    expect(values["X-Frame-Options"]).toBe("DENY");
    expect(values["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("lets the development server run without any of it", () => {
    expect(() => config(DEV)).not.toThrow();
    expect(config(DEV).headers).toBeUndefined();
  });

  it("allows localhost only when explicitly asked to", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4200";
    process.env.SITE_URL = "http://localhost:3200";
    process.env.ALLOW_LOCALHOST = "1";
    expect(() => config(BUILD)).not.toThrow();
  });
});
