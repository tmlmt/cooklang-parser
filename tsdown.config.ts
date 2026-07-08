import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"], // produce CommonJS (.cjs) and ESM (.mjs)
  sourcemap: true,
  target: "es2022",
  deps: {
    onlyBundle: ["human-regex"], // runtime dep used internally; bundle it to keep the library self-contained
  },
});
