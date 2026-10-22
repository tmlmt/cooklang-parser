import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface DiagnosticPage {
  code: string;
  level: "error (fatal)" |"error" | "warning";
  title: string;
  /** Markdown body, without frontmatter */
  body: string;
}

const codesDir = join(__dirname, "../e/codes");

/**
 * Reads the hand-written `docs/e/codes/<CODE>.md` pages. Frontmatter must
 * contain `code`, `level` and `title`.
 */
export function readDiagnosticPages(): DiagnosticPage[] {
  return readdirSync(codesDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((file) => {
      const raw = readFileSync(join(codesDir, file), "utf8");
      const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
      if (!match) throw new Error(`${file}: missing frontmatter`);
      const meta = Object.fromEntries(
        match[1]!.split(/\r?\n/).map((line) => {
          const idx = line.indexOf(":");
          return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
        }),
      );
      return {
        code: meta.code!,
        level: meta.level as DiagnosticPage["level"],
        title: meta.title!,
        body: match[2]!,
      };
    });
}
