import type { Diagnostic, DiagnosticSourceSpan } from "../types";

function expandTabs(line: string, tabWidth = 4): string {
  let out = "";
  for (const ch of line) {
    if (ch === "\t") {
      out += " ".repeat(tabWidth);
    } else {
      out += ch;
    }
  }
  return out;
}

function rawToDisplayColumn(
  line: string,
  rawColumn: number,
  tabWidth = 4,
): number {
  let displayColumn = 1;
  let raw = 1;
  for (const ch of line) {
    if (raw >= rawColumn) break;
    if (ch === "\t") {
      displayColumn += tabWidth;
    } else {
      displayColumn++;
    }
    raw++;
  }
  return displayColumn;
}

/**
 * Renders a source span as a code frame (location marker, source lines and
 * caret pointers), without any diagnostic header.
 *
 * @category Diagnostics
 * @param span - The span to render. Positions refer to `source`.
 * @param source - The original text the span refers to.
 * @param label - Optional label shown in the location marker (default `"recipe"`).
 * @returns A multi-line plain-text string.
 */
export function formatCodeFrame(
  span: DiagnosticSourceSpan,
  source: string,
  label = "recipe",
): string {
  const { line, column } = span.start;
  const sourceLines = source.split(/\r\n?|\n/);
  const startLine = Math.max(1, span.start.line);
  const endLine = Math.max(startLine, span.end.line);
  const width = String(endLine).length;
  const padEmpty = " ".repeat(width + 1);

  const parts: string[] = [
    `${padEmpty}┌─ ${label}:${line}:${column}`,
    `${padEmpty}│`,
  ];
  for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
    const sourceLine = sourceLines[lineNumber - 1] ?? "";
    const displayLine = expandTabs(sourceLine);

    const rawStartColumn = lineNumber === startLine ? span.start.column : 1;
    const rawEndColumn =
      lineNumber === endLine ? span.end.column : sourceLine.length + 1;
    const displayStart = rawToDisplayColumn(sourceLine, rawStartColumn);
    const displayEnd = rawToDisplayColumn(sourceLine, rawEndColumn);
    const caretLen = Math.max(1, displayEnd - displayStart);

    parts.push(
      `${String(lineNumber).padStart(width)} │ ${displayLine}`,
      `${padEmpty}│ ${" ".repeat(displayStart - 1)}${"^".repeat(caretLen)}`,
    );
  }

  return parts.join("\n");
}

/**
 * Renders a single {@link Diagnostic} as a human-readable string
 * with a source code frame (caret pointer) when span information is available.
 *
 * @category Diagnostics
 * @example
 * ```
 * error[COOKLANG_E0101]: Invalid quantity format: "%two"
 *   ┌─ recipe:1:12
 *   │
 * 1 │ Add @flour{%two}
 *   │            ^^^^
 *   = fix: Use a number (3), range (1-2), or fraction (1/2).
 *   = see: https://cooklang-parser.tmlmt.com/v3/e/cooklang_e1001
 * ```
 *
 * @param diagnostic - The diagnostic to render.
 * @param source - The original text returned in {@link DiagnosticError.source}
 *   or stored on {@link DiagnosticError.source}. Span positions refer to
 *   this string.
 * @param label - Optional label shown in the location marker (default `"recipe"`).
 * @returns A multi-line plain-text string.
 */
export function formatDiagnostic(
  diagnostic: Diagnostic,
  source: string,
  label = "recipe",
): string {
  const { code, message, fix, docs, severity, span } = diagnostic;
  const header = `${severity}[${code}]: ${message}`;

  if (!span) {
    const parts: string[] = [header];
    if (fix) parts.push(`  = fix: ${fix}`);
    if (docs) parts.push(`  = see: ${docs}`);
    return parts.join("\n");
  }

  const padEmpty = " ".repeat(String(span.end.line).length + 1);
  const parts: string[] = [header, formatCodeFrame(span, source, label)];

  if (fix) parts.push(`${padEmpty}= fix: ${fix}`);
  if (docs) parts.push(`${padEmpty}= see: ${docs}`);

  return parts.join("\n");
}

/**
 * Convenience wrapper that formats all diagnostics in `diagnostics` and joins
 * them with a blank line separator.
 *
 * @category Diagnostics
 * @param diagnostics - The diagnostics to render.
 * @param source - The original text returned in {@link DiagnosticError.source}
 *   or stored on {@link DiagnosticError.source}. Span positions refer to
 *   this string.
 * @param label - Optional label shown in the location marker (default `"recipe"`).
 * @returns A multi-line plain-text string.
 */
export function formatDiagnostics(
  diagnostics: Diagnostic[],
  source: string,
  label?: string,
): string {
  return diagnostics
    .map((d) => formatDiagnostic(d, source, label))
    .join("\n\n");
}
