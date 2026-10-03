import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";


// Skipped when DATABASE_URL is already set (CI, hosting).
if (!process.env.DATABASE_URL) {
  process.loadEnvFile(resolve(__dirname, "../../.env"));
}

export default defineConfig({
  schema: "./src/schema/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
