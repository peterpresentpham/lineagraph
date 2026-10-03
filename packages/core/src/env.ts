import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Loads the repo-root .env so every entry point (API, scripts, drizzle) sees the same
// variables whatever the cwd. Real environment variables win over the file.
export function loadRootEnv() {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const file = resolve(dir, ".env");
    if (existsSync(file) && existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
      process.loadEnvFile(file);
      return;
    }
    dir = resolve(dir, "..");
  }
}
