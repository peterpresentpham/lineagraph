import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const isLocal = (value: string) => /localhost|127\.0\.0\.1/.test(value);

export default defineConfig(({ command, mode }) => {
  // VITE_* values are baked into the bundle, so a production build with the API address left
  // unset (or at localhost) would ship an admin that calls the visitor's own machine.
  if (command === "build" && mode === "production") {
    const env = loadEnv(mode, process.cwd(), "VITE_");
    if (env.ALLOW_LOCALHOST !== "1" && process.env.ALLOW_LOCALHOST !== "1") {
      const api = env.VITE_API_URL;
      if (!api || isLocal(api)) {
        throw new Error(
          `VITE_API_URL must be the public address of the API for a production build (got "${api ?? ""}")`,
        );
      }
    }
  }
  return {
    plugins: [react(), tailwindcss()],
    server: { port: 4100, strictPort: true },
  };
});
