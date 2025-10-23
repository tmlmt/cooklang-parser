import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      enabled: true,
      include: ["src/**"],
      exclude: ["src/types.ts", "src/index.ts"],
    },
  },
});
