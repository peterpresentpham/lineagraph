// Imported first on purpose: @lineagraph/core loads the root .env, which the
// modules below (JWT_SECRET, DATABASE_URL) read at import time.
import { invalidateGraphCache } from "@lineagraph/core";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { errorHandler, publicCache } from "./http.js";
import { auditWrites } from "./middleware/audit.js";
import { authRouter } from "./routes/auth.js";
import { graphRouter } from "./routes/graph.js";
import { eventsRouter } from "./routes/events.js";
import { placesRouter } from "./routes/places.js";
import { relationsRouter } from "./routes/relations.js";
import { searchRouter } from "./routes/search.js";
import { timelineRouter } from "./routes/timeline.js";
import { learningRouter } from "./routes/learning.js";
import { contentRouter } from "./routes/content.js";
import { reviewRouter } from "./routes/review.js";
import { provenanceRouter } from "./routes/provenance.js";
import { registryRouter } from "./routes/registry.js";
import { opsRouter } from "./routes/ops.js";

const app = express();
// Behind a reverse proxy the client address is in X-Forwarded-For; set TRUST_PROXY to the number
// of proxies in front of the API so rate limits are per client instead of per proxy.
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY));
app.use(helmet());
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});
// A generous ceiling for every route; login has its own much stricter limiter.
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === "/health",
    message: { error: "Quá nhiều yêu cầu, vui lòng thử lại sau" },
  }),
);
app.use(
  cors({
    origin: [
      process.env.WEB_ORIGIN ?? "http://localhost:3200",
      process.env.ADMIN_ORIGIN ?? "http://localhost:4100",
    ],
    maxAge: 600,
  }),
);
app.use(express.json());

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

app.get("/health", (_req, res) => res.json({ ok: true }));

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

// Public reads first, so admin-guarded routers below never shadow them.
app.use(graphRouter);
app.use(searchRouter);
app.use(timelineRouter);
app.use(registryRouter);
app.use(placesRouter);
app.use(eventsRouter);
app.use(provenanceRouter);
app.use(authRouter);
app.use(contentRouter);
app.use(opsRouter);
app.use(relationsRouter);
app.use(learningRouter);
app.use(reviewRouter);

app.use(errorHandler);

const port = process.env.PORT ? Number(process.env.PORT) : 4200;
app.listen(port, () => {
  console.log(`lineagraph api listening on :${port}`);
});
