import { describe, it, expect } from "vitest";
import {
  buildLineOffsets,
  makeSpan,
  spanToLocString,
} from "../src/utils/spans";
import type { SourceSpan } from "../src/types";

describe("buildLineOffsets", () => {
  it("returns [0] for empty string", () => {
    expect(buildLineOffsets("")).toEqual([0]);
  });

  it("handles a single line with no newline", () => {
    expect(buildLineOffsets("hello")).toEqual([0]);
  });

  it("handles \\n line endings", () => {
    expect(buildLineOffsets("line1\nline2\nline3")).toEqual([0, 6, 12]);
  });

  it("handles \\r\\n line endings", () => {
    expect(buildLineOffsets("line1\r\nline2\r\nline3")).toEqual([0, 7, 14]);
  });

  it("handles bare \\r line endings", () => {
    expect(buildLineOffsets("line1\rline2\rline3")).toEqual([0, 6, 12]);
  });

  it("handles trailing newline", () => {
    expect(buildLineOffsets("line1\nline2\n")).toEqual([0, 6, 12]);
  });
});

describe("makeSpan", () => {
  it("creates span for first line", () => {
    const offsets = buildLineOffsets("Add @flour{1%g}");
    const span = makeSpan(offsets, 0, 4, 12);
    expect(span).toEqual<SourceSpan>({
      start: { offset: 4, line: 1, column: 5 },
      end: { offset: 16, line: 1, column: 17 },
    });
  });

  it("creates span for second line", () => {
    const offsets = buildLineOffsets("first line\nsecond line");
    const span = makeSpan(offsets, 1, 0, 6);
    expect(span).toEqual<SourceSpan>({
      start: { offset: 11, line: 2, column: 1 },
      end: { offset: 17, line: 2, column: 7 },
    });
  });

  it("falls back to offset 0 for out-of-bounds lineIdx", () => {
    const offsets = buildLineOffsets("hello");
    const span = makeSpan(offsets, 99, 0, 3);
    expect(span.start.offset).toBe(0);
  });
});

describe("spanToLocString", () => {
  it("formats span as line:column", () => {
    const offsets = buildLineOffsets("Add @flour{1%g}");
    const span = makeSpan(offsets, 0, 4, 12);
    expect(spanToLocString(span)).toBe("1:5");
  });
});
