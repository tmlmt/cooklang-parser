import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"], // produce CommonJS (.cjs) and ESM (.mjs)
  dts: true, // generate .d.ts
  sourcemap: true,
  clean: true,
  splitting: false, // single-file outputs for libraries
  target: "es2020",
});
