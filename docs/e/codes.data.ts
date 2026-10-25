import { readDiagnosticPages } from "../.vitepress/diagnostics-docs";

// See https://vitepress.dev/guide/data-loading

export interface Data {
  code: string;
  level: string;
  title: string;
}

declare const data: Data[];
export { data };

export default {
  watch: ["./codes/*.md"],
  load(): Data[] {
    return readDiagnosticPages().map(({ code, level, title }) => ({
      code,
      level,
      title,
    }));
  },
};
