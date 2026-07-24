import type { CooklangParseDiagnostic } from "../types";

/**
 * Renders a single {@link CooklangParseDiagnostic} as a human-readable string
 * with a source code frame (caret pointer) when span information is available.
 *
 * @category Diagnostics
 * @example
 * ```
 * error[invalid-quantity]: Invalid quantity format: "%two"
 *   ┌─ recipe:1:12
 *   │
 * 1 │ Add @flour{%two}
 *   │            ^^^^
 *   = fix: Use a number (3), range (1-2), or fraction (1/2).
 *   = see: https://cooklang-parser.tmlmt.com/e/invalid-quantity
 * ```
 *
 * @param diagnostic - The diagnostic to render.
 * @param source - The cleaned body text returned in {@link ParseResult.source}
 *   or stored on {@link CooklangParseError.source}. Span positions refer to
 *   this string.
 * @param label - Optional label shown in the location marker (default `"recipe"`).
 * @returns A multi-line plain-text string.
 */
export function formatDiagnostic(
  diagnostic: CooklangParseDiagnostic,
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

  const { line, column } = span.start;
  const endColumn =
    span.end.line === span.start.line ? span.end.column : column + 1;
  const caretLen = Math.max(1, endColumn - column);

  const sourceLines = source.split(/\r\n?|\n/);
  const sourceLine = sourceLines[line - 1] ?? "";
  const lineNumStr = String(line);
  // padLine replaces the digit(s) with spaces so caret and frame lines align
  const padLine = lineNumStr + " ";
  const padEmpty = " ".repeat(padLine.length);

  const parts: string[] = [
    header,
    `${padEmpty}┌─ ${label}:${line}:${column}`,
    `${padEmpty}│`,
    `${padLine}│ ${sourceLine}`,
    `${padEmpty}│ ${" ".repeat(column - 1)}${"^".repeat(caretLen)}`,
  ];

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
 * @param source - The cleaned body text returned in {@link ParseResult.source}
 *   or stored on {@link CooklangParseError.source}. Span positions refer to
 *   this string.
 * @param label - Optional label shown in the location marker (default `"recipe"`).
 * @returns A multi-line plain-text string.
 */
export function formatDiagnostics(
  diagnostics: CooklangParseDiagnostic[],
  source: string,
  label?: string,
): string {
  return diagnostics
    .map((d) => formatDiagnostic(d, source, label))
    .join("\n\n");
}
