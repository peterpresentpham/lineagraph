import express from "express";
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
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(graphRouter);
app.use(relationsRouter);
app.use(searchRouter);
app.use(timelineRouter);
app.use(learningRouter);
app.use(contentRouter);
app.use(reviewRouter);
app.use(provenanceRouter);
app.use(registryRouter);
app.use(opsRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`lineagraph api listening on :${port}`);
});
