import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // The suites share one test database and one in-process cache, so files run one at a time.
    fileParallelism: false,
  },
});
