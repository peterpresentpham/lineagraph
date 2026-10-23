import { afterAll, beforeAll, describe, expect, it } from "vitest";

// API tests against a real, migrated Postgres (never the shared one):
//   createdb lineagraph_test && DATABASE_URL=... pnpm db:migrate && pnpm db:seed
//   TEST_DATABASE_URL=postgres://localhost/lineagraph_test pnpm --filter @lineagraph/api test
// Without TEST_DATABASE_URL the whole file is skipped.
const url = process.env.TEST_DATABASE_URL;

const PASSWORD = "correct horse battery staple";
const ORIGIN_WEB = "https://web.test";
const ORIGIN_ADMIN = "https://admin.test";
const NIL_UUID = "00000000-0000-4000-8000-000000000000";

type Core = typeof import("@lineagraph/core");
type Supertest = typeof import("supertest");
type App = ReturnType<typeof import("./app.js").createApp>;

let core: Core;
let request: Supertest;
let makeApp: typeof import("./app.js").createApp;
let sign: typeof import("./middleware/auth.js").signAdminToken;
let secret: Uint8Array;
let jose: typeof import("jose");
let app: App;
let adminId: string;
let bcrypt: typeof import("bcryptjs");

const config = {
  production: false,
  port: 0,
  corsOrigins: [ORIGIN_WEB, ORIGIN_ADMIN],
  trustProxy: 1,
};
const email = `api-test-${Date.now()}@example.com`;

// Every route declared on the app, found by walking Express's router stack.
type Layer = {
  route?: { path: string | string[]; methods: Record<string, boolean> };
  handle?: { stack?: Layer[] };
  name?: string;
};
function collectRoutes(stack: Layer[], out: { method: string; path: string }[] = []) {
  for (const layer of stack) {
    if (layer.route) {
      const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      for (const path of paths) {
        for (const method of Object.keys(layer.route.methods)) out.push({ method, path });
      }
    } else if (layer.handle?.stack) {
      collectRoutes(layer.handle.stack, out);
    }
  }
  return out;
}

async function login(a: App = app, password = PASSWORD) {
  return request(a).post("/auth/login").send({ email, password });
}

describe.skipIf(!url)("api", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.JWT_SECRET = "test-secret-test-secret-test-secret-test-secret";
    secret = new TextEncoder().encode(process.env.JWT_SECRET);
    core = await import("@lineagraph/core");
    request = (await import("supertest")).default as unknown as Supertest;
    jose = await import("jose");
    bcrypt = (await import("bcryptjs")).default as unknown as typeof import("bcryptjs");
    makeApp = (await import("./app.js")).createApp;
    sign = (await import("./middleware/auth.js")).signAdminToken;
    app = makeApp(config);

    const [row] = await core.db
      .insert(core.authSchema.admin)
      .values({ email, passwordHash: await bcrypt.hash(PASSWORD, 4) })
      .returning({ id: core.authSchema.admin.id });
    adminId = row!.id;
  });

  afterAll(async () => {
    if (!core) return;
    await core.sql`delete from auth.admin where id = ${adminId}`.catch(() => undefined);
    await core.sql.end();
  });

  describe("authorization", () => {
    // The public POST routes: login (validates its body) and the read-only graph expansion.
    const publicWrites = new Set(["POST /auth/login", "POST /graph/expand"]);

    it("rejects every write route that is not explicitly public when there is no token", async () => {
      const routes = collectRoutes(
        (app as unknown as { _router: { stack: Layer[] } })._router.stack,
      )
        .filter((r) => r.method !== "get")
        .filter((r) => !publicWrites.has(`${r.method.toUpperCase()} ${r.path}`));
      // The suite is only worth anything if it really found the routes.
      expect(routes.length).toBeGreaterThan(25);
      for (const { method, path } of routes) {
        const target = path.replace(/:[a-zA-Z]+/g, NIL_UUID);
        const res = await (
          request(app) as never as Record<string, (p: string) => import("supertest").Test>
        )[method]!(target).send({});
        expect(res.status, `${method.toUpperCase()} ${path} must need a login`).toBe(401);
      }
    });

    it("rejects admin-only reads when there is no token", async () => {
      const paths = [
        "/stats",
        "/recent",
        "/sources",
        "/consistency-report",
        "/auth/me",
        `/persons/${NIL_UUID}/edit`,
        `/polities/${NIL_UUID}/edit`,
        `/events/${NIL_UUID}/edit`,
        "/tenures",
        `/tenures/${NIL_UUID}`,
        "/relationships",
        `/relationships/${NIL_UUID}`,
      ];
      for (const path of paths) {
        const res = await request(app).get(path);
        expect(res.status, `GET ${path}`).toBe(401);
      }
    });

    it("rejects a malformed token, a token signed with another key, and an expired token", async () => {
      expect(
        (await request(app).get("/stats").set("Authorization", "Bearer nonsense")).status,
      ).toBe(401);
      const foreign = await new jose.SignJWT({ email, ver: 0 })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(adminId)
        .setExpirationTime("10m")
        .sign(new TextEncoder().encode("another-secret-another-secret-another-secret"));
      expect(
        (await request(app).get("/stats").set("Authorization", `Bearer ${foreign}`)).status,
      ).toBe(401);
      const expired = await new jose.SignJWT({ email, ver: 0 })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(adminId)
        .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
        .sign(secret);
      expect(
        (await request(app).get("/stats").set("Authorization", `Bearer ${expired}`)).status,
      ).toBe(401);
    });

    it("rejects a token for an account that does not exist", async () => {
      const ghost = await sign(NIL_UUID, "ghost@example.com", 0);
      expect(
        (await request(app).get("/stats").set("Authorization", `Bearer ${ghost}`)).status,
      ).toBe(401);
    });
  });

  describe("sessions", () => {
    it("logs in, renews and revokes", async () => {
      const bad = await login(app, "wrong password");
      expect(bad.status).toBe(401);
      expect(bad.body.error).toBe("Email hoặc mật khẩu không đúng");

      const ok = await login();
      expect(ok.status).toBe(200);
      expect(ok.body.expiresIn).toBe(1800);
      const token: string = ok.body.token;
      const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

      expect((await request(app).get("/auth/me").set(auth(token))).body.email).toBe(email);
      expect((await request(app).get("/stats").set(auth(token))).status).toBe(200);

      // Renewing issues a second token that works too.
      const renewed = await request(app).post("/auth/refresh").set(auth(token));
      expect(renewed.status).toBe(200);
      expect((await request(app).get("/stats").set(auth(renewed.body.token))).status).toBe(200);

      // Logging out ends *every* session of the account, the renewed one included.
      expect((await request(app).post("/auth/logout").set(auth(token))).status).toBe(204);
      expect((await request(app).get("/stats").set(auth(token))).status).toBe(401);
      expect((await request(app).get("/stats").set(auth(renewed.body.token))).status).toBe(401);
      expect((await request(app).post("/auth/refresh").set(auth(token))).status).toBe(401);

      // A new login works again, under the new version.
      const again = await login();
      expect(again.status).toBe(200);
      expect((await request(app).get("/stats").set(auth(again.body.token))).status).toBe(200);
    });

    it("answers unknown account and wrong password alike", async () => {
      const unknown = await request(app)
        .post("/auth/login")
        .send({ email: "nobody@example.com", password: "whatever" });
      const wrong = await login(app, "nope");
      expect(unknown.status).toBe(wrong.status);
      // Everything but the per-request id must match, or the response would reveal which emails exist.
      const { requestId: _a, ...unknownBody } = unknown.body;
      const { requestId: _b, ...wrongBody } = wrong.body;
      expect(unknownBody).toEqual(wrongBody);
      expect(unknownBody.code).toBe("INVALID_CREDENTIALS");
    });

    it("stops guessing one account from many addresses", async () => {
      const limited = makeApp(config, { loginLimits: { perIp: 100, perEmail: 3 } });
      const attempt = (ip: string) =>
        request(limited)
          .post("/auth/login")
          .set("X-Forwarded-For", ip)
          .send({ email: "victim@example.com", password: "guess" });
      expect((await attempt("10.0.0.1")).status).toBe(401);
      expect((await attempt("10.0.0.2")).status).toBe(401);
      expect((await attempt("10.0.0.3")).status).toBe(401);
      // The fourth guess comes from yet another address and is still refused.
      expect((await attempt("10.0.0.4")).status).toBe(429);
    });

    it("stops one address from trying many accounts", async () => {
      const limited = makeApp(config, { loginLimits: { perIp: 3, perEmail: 100 } });
      const attempt = (n: number) =>
        request(limited)
          .post("/auth/login")
          .set("X-Forwarded-For", "10.9.9.9")
          .send({ email: `victim${n}@example.com`, password: "guess" });
      for (let n = 0; n < 3; n++) expect((await attempt(n)).status).toBe(401);
      expect((await attempt(99)).status).toBe(429);
    });

    it("does not count successful logins against the limit", async () => {
      const limited = makeApp(config, { loginLimits: { perIp: 2, perEmail: 2 } });
      for (let i = 0; i < 5; i++) expect((await login(limited)).status).toBe(200);
    });
  });

  describe("public surface", () => {
    it("answers health checks, and reports a database outage", async () => {
      expect((await request(app).get("/health")).body).toEqual({ ok: true });
      expect((await request(app).get("/health/live")).status).toBe(200);
      const broken = makeApp(config, {
        checkDatabase: async () => {
          throw new Error("down");
        },
      });
      expect((await request(broken).get("/health")).status).toBe(503);
      // Liveness must not depend on the database, or a DB outage would restart healthy servers.
      expect((await request(broken).get("/health/live")).status).toBe(200);
    });

    it("only lets the configured origins call it from a browser", async () => {
      const allowed = await request(app).get("/registries").set("Origin", ORIGIN_WEB);
      expect(allowed.headers["access-control-allow-origin"]).toBe(ORIGIN_WEB);
      const stranger = await request(app).get("/registries").set("Origin", "https://evil.example");
      expect(stranger.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("sends security headers and a request id, and hides the framework", async () => {
      const res = await request(app).get("/registries");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
      expect(res.headers["x-powered-by"]).toBeUndefined();
    });

    it("rejects malformed and oversized input instead of failing", async () => {
      expect((await request(app).get("/persons?limit=abc")).status).toBe(400);
      expect((await request(app).get("/persons?offset=99999999")).status).toBe(400);
      expect((await request(app).get(`/search?q=${"x".repeat(101)}`)).status).toBe(400);
      expect((await request(app).get(`/relations?a=${"x".repeat(101)}&b=y`)).status).toBe(400);
      expect((await request(app).get("/persons/not-a-real-person")).status).toBe(404);
      const types = Array.from({ length: 21 }, (_, i) => `t${i}`).join(",");
      expect((await request(app).get(`/nodes/x/graph?types=${types}`)).status).toBe(400);
      const big = await request(app)
        .post("/auth/login")
        .send({ email, password: "x".repeat(300_000) });
      expect(big.status).toBe(413);
      const notJson = await request(app)
        .post("/auth/login")
        .set("Content-Type", "application/json")
        .send("{nope");
      expect(notJson.status).toBe(400);
    });

    it("limits the expensive public routes per client", async () => {
      const strict = makeApp(config, { heavyLimit: 3 });
      const hit = () => request(strict).get("/search?q=abc").set("X-Forwarded-For", "10.1.1.1");
      for (let i = 0; i < 3; i++) expect((await hit()).status).toBe(200);
      expect((await hit()).status).toBe(429);
      // Another client is unaffected.
      const other = await request(strict).get("/search?q=abc").set("X-Forwarded-For", "10.1.1.2");
      expect(other.status).toBe(200);
    });

    it("serves the bibliography and timeline index publicly, without editors' notes", async () => {
      const bib = await request(app).get("/bibliography");
      expect(bib.status).toBe(200);
      expect(Array.isArray(bib.body.items)).toBe(true);
      expect(JSON.stringify(bib.body)).not.toContain('"note"');
      expect((await request(app).get("/timeline/centuries")).status).toBe(200);
      expect((await request(app).get("/timeline?century=15")).status).toBe(200);
      expect((await request(app).get("/timeline?century=abc")).status).toBe(400);
    });

    it("reads a typed year, with or without TCN, and offers a random entry", async () => {
      const year = async (q: string) =>
        (await request(app).get(`/search/related?q=${encodeURIComponent(q)}`)).body.year;
      expect(await year("1428")).toBe(1428);
      expect(await year("năm 1428")).toBe(1428);
      expect(await year("490 TCN")).toBe(-490);
      expect(await year("0")).toBeNull();
      expect(await year("Lê Lợi")).toBeNull();
      const random = await request(app).get("/random?kind=person");
      expect(random.status).toBe(200);
      expect(random.headers["cache-control"]).toBe("no-store");
      expect(random.body.kind).toBe("person");
    });

    it("no longer exposes the unfinished review and learning routes", async () => {
      for (const path of ["/review/today", "/progress", "/review-queue"]) {
        expect((await request(app).get(path)).status, path).toBe(404);
      }
    });
  });

  describe("deleted records", () => {
    it("never appear on a public endpoint", async () => {
      const unique = `Xoamem${Date.now()}`;
      const names = (n: string) => [{ name: n, kind: "common", isPrimary: true }];
      const person = await core.createPerson(
        core.personInput.parse({ names: names(`${unique} Người`), birth: { year: 1400 } }),
      );
      const polity = await core.createPolity(
        core.polityInput.parse({
          names: names(`${unique} Chính thể`),
          polityType: "state",
          started: { year: 1400 },
        }),
      );
      const event = await core.createEvent(
        core.eventInput.parse({
          names: names(`${unique} Sự kiện`),
          eventType: "battle",
          start: { year: 1400 },
        }),
      );

      // Visible while alive...
      const alive = await request(app).get(`/search?q=${unique}`);
      expect(alive.body).toHaveLength(3);
      expect((await request(app).get(`/persons/${person.slug}`)).status).toBe(200);

      await core.deletePerson(person.id);
      await core.deletePolity(polity.id);
      await core.deleteEvent(event.id);

      // ...and gone from every public read once deleted.
      const gone = [
        `/search?q=${unique}`,
        `/persons?q=${unique}`,
        `/polities?q=${unique}`,
        `/events?q=${unique}`,
      ];
      for (const path of gone) {
        const body = (await request(app).get(path)).body;
        const found = Array.isArray(body) ? body : body.items;
        expect(found, path).toHaveLength(0);
      }
      for (const path of [
        `/persons/${person.slug}`,
        `/persons/${person.slug}/ancestors`,
        `/persons/${person.slug}/descendants`,
        `/polities/${polity.slug}`,
        `/polities/${polity.slug}/graph`,
        `/events/${event.slug}`,
        `/nodes/${person.slug}/graph`,
      ]) {
        expect((await request(app).get(path)).status, path).toBe(404);
      }
      const timeline = JSON.stringify((await request(app).get("/timeline")).body);
      expect(timeline).not.toContain(unique);
    });
  });
});
