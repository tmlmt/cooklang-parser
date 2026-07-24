import { describe, it, expect } from "vitest";
import { formatDiagnostic, formatDiagnostics } from "../src/utils/code_frame";
import type { CooklangParseDiagnostic } from "../src/types";

const source = "Add @flour{%two} and @water{200%mL}";

const diagWithSpan: CooklangParseDiagnostic = {
  code: "invalid-quantity",
  message: 'Invalid quantity format: "%two"',
  fix: "Use a number (3), range (1-2), or fraction (1/2).",
  docs: "https://cooklang-parser.tmlmt.com/e/invalid-quantity",
  severity: "error",
  span: {
    start: { offset: 10, line: 1, column: 11 },
    end: { offset: 15, line: 1, column: 16 },
  },
};

const diagWithoutSpan: CooklangParseDiagnostic = {
  code: "timer-missing-unit",
  message: "Timer has a value but no unit.",
  fix: "Add a unit, e.g. ~{5%minutes}.",
  severity: "error",
};

const warningDiag: CooklangParseDiagnostic = {
  code: "some-warning",
  message: "Something to watch out for",
  severity: "warning",
};

describe("formatDiagnostic", () => {
  it("renders a diagnostic with span as a code frame", () => {
    const output = formatDiagnostic(diagWithSpan, source);
    expect(output).toMatchSnapshot();
  });

  it("includes the fix and docs lines", () => {
    const output = formatDiagnostic(diagWithSpan, source);
    expect(output).toContain("= fix:");
    expect(output).toContain("= see:");
  });

  it("renders a diagnostic without span without code frame", () => {
    const output = formatDiagnostic(diagWithoutSpan, source);
    expect(output).not.toContain("│");
    expect(output).not.toContain("┌─");
    expect(output).toContain("error[timer-missing-unit]:");
    expect(output).toContain("= fix:");
  });

  it("uses the custom label in the location marker", () => {
    const output = formatDiagnostic(diagWithSpan, source, "my-recipe.cook");
    expect(output).toContain("my-recipe.cook:1:11");
  });

  it("renders a warning severity correctly", () => {
    const output = formatDiagnostic(warningDiag, source);
    expect(output).toContain("warning[some-warning]:");
  });

  it("renders a diagnostic without fix or docs with no extra lines", () => {
    const output = formatDiagnostic(warningDiag, source);
    expect(output).not.toContain("= fix:");
    expect(output).not.toContain("= see:");
  });

  it("renders correctly for a multi-digit line number", () => {
    const longSource = "\n".repeat(9) + "Add @flour{%bad}";
    const diagLine10: CooklangParseDiagnostic = {
      code: "invalid-quantity",
      message: 'Invalid quantity format: "%bad"',
      severity: "error",
      span: {
        start: { offset: 10, line: 10, column: 11 },
        end: { offset: 15, line: 10, column: 16 },
      },
    };
    const output = formatDiagnostic(diagLine10, longSource);
    expect(output).toContain("10 │");
    expect(output).toMatchSnapshot();
  });
});

describe("formatDiagnostics", () => {
  it("joins multiple diagnostics with blank lines", () => {
    const output = formatDiagnostics([diagWithSpan, diagWithoutSpan], source);
    expect(output).toContain("\n\n");
    expect(output).toContain("invalid-quantity");
    expect(output).toContain("timer-missing-unit");
  });

  it("returns empty string for empty array", () => {
    expect(formatDiagnostics([], source)).toBe("");
  });
});
