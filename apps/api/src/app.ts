import { invalidateGraphCache, sql } from "@lineagraph/core";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import type { Config } from "./config.js";
import { errorHandler, publicCache } from "./http.js";
import { requestLogger } from "./logger.js";
import { auditWrites } from "./middleware/audit.js";
import { globalLimiter, heavyLimiter } from "./middleware/limits.js";
import { createAuthRouter } from "./routes/auth.js";
import { contentRouter } from "./routes/content.js";
import { eventsRouter } from "./routes/events.js";
import { graphRouter } from "./routes/graph.js";
import { opsRouter } from "./routes/ops.js";
import { placesRouter } from "./routes/places.js";
import { provenanceRouter } from "./routes/provenance.js";
import { registryRouter } from "./routes/registry.js";
import { relationsRouter } from "./routes/relations.js";
import { searchRouter } from "./routes/search.js";
import { timelineRouter } from "./routes/timeline.js";

export type AppOptions = {
  /** Requests per minute per client for the expensive public routes (default 60). */
  heavyLimit?: number;
  /** Failed logins allowed per address / per account in 15 minutes (defaults 10 / 5). */
  loginLimits?: { perIp?: number; perEmail?: number };
  /** Checks that the database answers; replaced in tests to simulate an outage. */
  checkDatabase?: () => Promise<void>;
};

const DB_CHECK_TIMEOUT_MS = 2000;

async function pingDatabase() {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      sql`select 1`,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("database ping timed out")), DB_CHECK_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Builds the Express app without listening, so tests can drive it directly. */
export function createApp(config: Config, options: AppOptions = {}) {
  const app = express();
  // Behind a reverse proxy the client address is in X-Forwarded-For; trust exactly this many
  // proxies so rate limits are per client instead of per proxy.
  if (config.trustProxy !== undefined) app.set("trust proxy", config.trustProxy);
  app.disable("x-powered-by");
  app.use(requestLogger);
  app.use(helmet());

  // Health checks first: they must answer even when a limiter or the database is struggling.
  const checkDatabase = options.checkDatabase ?? pingDatabase;
  app.get("/health/live", (_req, res) => res.json({ ok: true }));
  app.get("/health", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      await checkDatabase();
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false, error: "database unavailable" });
    }
  });

  app.use(globalLimiter());
  app.use(cors({ origin: config.corsOrigins, maxAge: 600 }));
  app.use(express.json({ limit: "256kb" }));

  app.use(auditWrites);

  // Any successful write may change the relationship graph that path search keeps in memory.
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
      res.on("finish", () => {
        if (res.statusCode < 400) invalidateGraphCache();
      });
    }
    next();
  });

  // Public reads may be cached briefly by browsers and proxies (never for admin requests).
  app.use(
    [
      "/registries",
      "/relation-types",
      "/timeline",
      "/search",
      "/persons",
      "/polities",
      "/places",
      "/events",
      "/nodes",
    ],
    publicCache(30),
  );
  // The public routes that cost the database real work get their own, stricter limit.
  app.use(
    ["/search", "/random", "/relations", "/graph/expand", "/nodes", "/timeline"],
    heavyLimiter(options.heavyLimit),
  );

  // Public reads first, so admin-guarded routers below never shadow them.
  app.use(graphRouter);
  app.use(searchRouter);
  app.use(timelineRouter);
  app.use(registryRouter);
  app.use(placesRouter);
  app.use(eventsRouter);
  app.use(provenanceRouter);
  app.use(createAuthRouter(options.loginLimits));
  app.use(contentRouter);
  app.use(opsRouter);
  app.use(relationsRouter);

  app.use(errorHandler);
  return app;
}
