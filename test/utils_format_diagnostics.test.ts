import { describe, it, expect } from "vitest";
import { Recipe } from "../src/classes/recipe";
import { parseCollect } from "./mocks/parse_collect";
import {
  formatDiagnostic,
  formatDiagnostics,
} from "../src/utils/diagnostics_format";
import type { Diagnostic } from "../src/types";

const source = "Add @flour{%two} and @water{200%mL}";

const diagWithSpan: Diagnostic = {
  code: "COOKLANG_E0101",
  message: 'Invalid quantity format: "%two"',
  fix: "Use a number (3), range (1-2), or fraction (1/2).",
  docs: "https://cooklang-parser.tmlmt.com/v3/e/cooklang_e0101",
  severity: "error",
  span: {
    start: { offset: 10, line: 1, column: 11 },
    end: { offset: 15, line: 1, column: 16 },
  },
};

const diagWithoutSpan: Diagnostic = {
  code: "COOKLANG_E0102",
  message: "Timer has a value but no unit.",
  fix: "Add a unit, e.g. ~{5%minutes}.",
  severity: "error",
};

const warningDiag: Diagnostic = {
  code: "COOKLANG_W0101",
  message: "Something to watch out for",
  severity: "warning",
};

describe("formatDiagnostic", () => {
  it("renders a diagnostic without span with docs but no fix", () => {
    const output = formatDiagnostic(
      { ...diagWithoutSpan, fix: undefined, docs: "https://example.com" },
      source,
    );
    expect(output).not.toContain("fix:");
    expect(output).toContain("  = see: https://example.com");
  });

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
    expect(output).toContain("error[COOKLANG_E0102]:");
    expect(output).toContain("= fix:");
  });

  it("uses the custom label in the location marker", () => {
    const output = formatDiagnostic(diagWithSpan, source, "my-recipe.cook");
    expect(output).toContain("my-recipe.cook:1:11");
  });

  it("renders a warning severity correctly", () => {
    const output = formatDiagnostic(warningDiag, source);
    expect(output).toContain("warning[COOKLANG_W0101]:");
  });

  it("renders a diagnostic without fix or docs with no extra lines", () => {
    const output = formatDiagnostic(warningDiag, source);
    expect(output).not.toContain("= fix:");
    expect(output).not.toContain("= see:");
  });

  it("renders correctly for a multi-digit line number", () => {
    const longSource = "\n".repeat(9) + "Add @flour{%bad}";
    const diagLine10: Diagnostic = {
      code: "COOKLANG_E0101",
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

  it("formats parser diagnostics against the original recipe source", () => {
    const source = "---\r\ntitle: Test\r\n---\r\n\r\nAdd @flour{%bad}";
    const result = parseCollect(new Recipe(), source);
    const output = formatDiagnostic(result.diagnostics[0]!, result.source);

    expect(output).toContain("recipe:5:5");
    expect(output).toContain("5 │ Add @flour{%bad}");
    expect(output).toContain("│     ^^^^^^^^^^^^");
  });

  it("renders multi-line spans across several lines", () => {
    const multiLine: Diagnostic = {
      code: "COOKLANG_E0101",
      message: "Broken quantity",
      severity: "error",
      span: {
        start: { offset: 4, line: 1, column: 5 },
        end: { offset: 13, line: 2, column: 2 },
      },
    };
    const output = formatDiagnostic(multiLine, "Add @flour{1%g\n} and more");
    expect(output).toContain("1 │ Add @flour{1%g");
    expect(output).toContain("│     ^^^^^^^^^^");
    expect(output).toContain("2 │ } and more");
    expect(output).toContain("│ ^");
  });

  it("renders an empty source line when the span exceeds the source", () => {
    const outOfRange: Diagnostic = {
      code: "COOKLANG_E0101",
      message: "Broken quantity",
      severity: "error",
      span: {
        start: { offset: 0, line: 3, column: 1 },
        end: { offset: 0, line: 3, column: 1 },
      },
    };
    const output = formatDiagnostic(outOfRange, "one line");
    expect(output).toContain("3 │ ");
    expect(output).toContain("│ ^");
  });

  it("aligns carets when tabs are present", () => {
    const tabbed: Diagnostic = {
      code: "COOKLANG_E0101",
      message: "Broken quantity",
      severity: "error",
      span: {
        start: { offset: 4, line: 1, column: 5 },
        end: { offset: 9, line: 1, column: 10 },
      },
    };
    const output = formatDiagnostic(tabbed, "Add\t@flour{%x}");
    expect(output).toContain("1 │ Add    @flour{%x}");
    expect(output).toContain("│        ^^^^^");
  });
});

describe("formatDiagnostics", () => {
  it("joins multiple diagnostics with blank lines", () => {
    const output = formatDiagnostics([diagWithSpan, diagWithoutSpan], source);
    expect(output).toContain("\n\n");
    expect(output).toContain("COOKLANG_E0101");
    expect(output).toContain("COOKLANG_E0102");
  });

  it("returns empty string for empty array", () => {
    expect(formatDiagnostics([], source)).toBe("");
  });
});
