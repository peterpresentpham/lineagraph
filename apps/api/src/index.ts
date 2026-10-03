// Imported first for its side effect: @lineagraph/core loads the root .env, which the
// modules below (JWT_SECRET, DATABASE_URL) read at import time.
import "@lineagraph/core";
import express from "express";
import cors from "cors";
import { errorHandler } from "./http.js";
import { authRouter } from "./routes/auth.js";
import { graphRouter } from "./routes/graph.js";
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
app.use(
  cors({
    origin: [
      process.env.WEB_ORIGIN ?? "http://localhost:3000",
      process.env.ADMIN_ORIGIN ?? "http://localhost:4100",
    ],
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

// Public reads first, so admin-guarded routers below never shadow them.
app.use(graphRouter);
app.use(searchRouter);
app.use(timelineRouter);
app.use(registryRouter);
app.use(provenanceRouter);
app.use(authRouter);
app.use(contentRouter);
app.use(opsRouter);
app.use(relationsRouter);
app.use(learningRouter);
app.use(reviewRouter);

app.use(errorHandler);

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`lineagraph api listening on :${port}`);
});
