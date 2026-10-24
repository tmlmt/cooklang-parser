import { describe, it, expect } from "vitest";
import { createDiagnostic } from "../src/diagnostics";

describe("toHaveDiagnostic matcher", () => {
  const diagnostics = [
    createDiagnostic("COOKLANG_W0401", {}),
    createDiagnostic("COOKLANG_W0401", {}),
    createDiagnostic("COOKLANG_E0102", {}),
  ];

  it("matches by code", () => {
    expect(diagnostics).toHaveDiagnostic("COOKLANG_E0102");
    expect(diagnostics).not.toHaveDiagnostic("COOKLANG_E0101");
  });

  it("matches an exact count", () => {
    expect(diagnostics).toHaveDiagnostic("COOKLANG_W0401", { times: 2 });
    expect(diagnostics).not.toHaveDiagnostic("COOKLANG_W0401", { times: 1 });
  });

  it("matches extra fields", () => {
    expect(diagnostics).toHaveDiagnostic("COOKLANG_W0401", {
      match: { severity: "warning" },
    });
    expect(diagnostics).not.toHaveDiagnostic("COOKLANG_W0401", {
      match: { severity: "error" },
    });
  });

  it("reports received codes on failure", () => {
    expect(() =>
      expect(diagnostics).toHaveDiagnostic("COOKLANG_E0201", {
        match: { severity: "error" },
      }),
    ).toThrow(/found 0 match\(es\)\. Received:/);
    expect(() => expect([]).toHaveDiagnostic("COOKLANG_E0201")).toThrow(
      /no diagnostics/,
    );
    expect(() =>
      expect(diagnostics).not.toHaveDiagnostic("COOKLANG_E0102"),
    ).toThrow(/not to contain/);
  });
});

describe("toHaveDiagnostic deep partial match", () => {
  const diagnostics = [
    createDiagnostic(
      "COOKLANG_E0101",
      { value: "x" },
      {
        start: { line: 2, column: 3, offset: 10 },
        end: { line: 2, column: 6, offset: 13 },
      },
    ),
  ];

  it("matches only the specified nested fields", () => {
    expect(diagnostics).toHaveDiagnostic("COOKLANG_E0101", {
      match: { span: { start: { line: 2, column: 3 } } },
    });
    expect(diagnostics).not.toHaveDiagnostic("COOKLANG_E0101", {
      match: { span: { start: { line: 3 } } },
    });
  });
});
