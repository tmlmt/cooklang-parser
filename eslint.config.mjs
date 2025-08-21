import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: { parser: tsParser },
    plugins: { "@typescript-eslint": ts },
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },
];
