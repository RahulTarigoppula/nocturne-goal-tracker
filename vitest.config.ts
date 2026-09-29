import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

process.env.TZ = "Asia/Kolkata";

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify("test") },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    setupFiles: ["./src/test-setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/engine/**/*.ts", "src/data/**/*.ts"],
      exclude: ["**/*.test.ts", "src/data/fixtures.ts"],
    },
  },
});
