import { readDiagnosticPages } from "../.vitepress/diagnostics-docs";

// Generates one page per diagnostic code at /e/<code in lowercase>, matching
// the `docsBase` of the diagnostics catalog (src/diagnostics.ts).
// See: https://vitepress.dev/guide/routing#dynamic-routes
export default {
  paths() {
    return readDiagnosticPages().map(({ code, level, title, body }) => ({
      params: { code: code.toLowerCase(), codeUpper: code, level, title },
      content: body,
    }));
  },
};
