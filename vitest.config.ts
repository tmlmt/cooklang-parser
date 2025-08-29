import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      enabled: true,
      exclude: [
        "scripts/**",
        "src/types.ts",
        ...coverageConfigDefaults.exclude,
      ],
    },
  },
});
