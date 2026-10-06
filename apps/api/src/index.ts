// Imported first on purpose: @lineagraph/core loads the root .env, which the
// modules below (JWT_SECRET, DATABASE_URL) read at import time.
import { sql } from "@lineagraph/core";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { errorFields, log } from "./logger.js";

let config;
try {
  config = loadConfig();
} catch (err) {
  // A misconfigured production deploy must fail loudly and at once, before taking any traffic.
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const app = createApp(config);
const server = app.listen(config.port, () => {
  log("info", "listening", { port: config.port, production: config.production });
});

// Keep-alive just above a typical proxy's idle timeout, and bounded request times, so slow or
// half-open clients cannot hold sockets (and database connections behind them) forever.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 30_000;

let stopping = false;
async function shutdown(signal: string, exitCode = 0) {
  if (stopping) return;
  stopping = true;
  log("info", "shutting down", { signal });
  // Stop accepting connections, let in-flight requests finish, then close the database pool.
  const force = setTimeout(() => process.exit(exitCode || 1), 10_000);
  force.unref();
  server.close(async () => {
    await sql.end({ timeout: 5 }).catch(() => undefined);
    process.exit(exitCode);
  });
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  log("error", "unhandled rejection", errorFields(reason));
  void shutdown("unhandledRejection", 1);
});
process.on("uncaughtException", (err) => {
  log("error", "uncaught exception", errorFields(err));
  void shutdown("uncaughtException", 1);
});
