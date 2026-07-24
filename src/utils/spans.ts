import type { SourceSpan } from "../types";

/**
 * Builds an array of byte offsets at which each line starts in the source.
 * `lineOffsets[0]` is always `0`; `lineOffsets[n]` is the offset of line `n+1`.
 * Handles `\n`, `\r\n`, and bare `\r` line endings.
 */
export function buildLineOffsets(source: string): number[] {
  const offsets: number[] = [0];
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === "\r") {
      const next = source[i + 1];
      offsets.push(next === "\n" ? i + 2 : i + 1);
      if (next === "\n") i++;
    } else if (ch === "\n") {
      offsets.push(i + 1);
    }
  }
  return offsets;
}

/**
 * Creates a {@link SourceSpan} from a (0-based) line index, (0-based) column,
 * and token length, using a precomputed line-offset map.
 *
 * @param lineOffsets - Output of {@link buildLineOffsets}.
 * @param lineIdx     - 0-based line index within the source.
 * @param column      - 0-based character offset within the line.
 * @param length      - Number of characters in the token.
 */
export function makeSpan(
  lineOffsets: number[],
  lineIdx: number,
  column: number,
  length: number,
): SourceSpan {
  const lineStart = lineOffsets[lineIdx] ?? 0;
  const startOffset = lineStart + column;
  return {
    start: { offset: startOffset, line: lineIdx + 1, column: column + 1 },
    end: {
      offset: startOffset + length,
      line: lineIdx + 1,
      column: column + 1 + length,
    },
  };
}

/**
 * Formats a span's start position as `"line:column"` (both 1-based).
 */
export function spanToLocString(span: SourceSpan): string {
  return `${span.start.line}:${span.start.column}`;
}
