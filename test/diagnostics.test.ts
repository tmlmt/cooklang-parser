import { describe, it, expect } from "vitest";
import { createDiagnostic } from "../src/diagnostics";
import { Recipe, DiagnosticError } from "../src/index";
import { parseCollect } from "./mocks/parse_collect";
import type { Diagnostic } from "../src/types";

describe("createDiagnostic", () => {
  it("invalidQuantity returns correct shape", () => {
    const d = createDiagnostic("COOKLANG_E0101", { value: "%two" });
    expect(d).toMatchObject<Partial<Diagnostic>>({
      code: "COOKLANG_E0101",
      severity: "error",
    });
    expect(d.message).toContain("%two");
    expect(d.fix).toBeDefined();
    expect(d.docs).toContain("cooklang_e0101");
    expect(d.span).toBeUndefined();
  });

  it("timerMissingUnit returns correct shape", () => {
    const d = createDiagnostic("COOKLANG_E0102", {});
    expect(d).toMatchObject<Partial<Diagnostic>>({
      code: "COOKLANG_E0102",
      severity: "error",
    });
    expect(d.fix).toBeDefined();
  });

  it("referencedIngredientNotFound returns correct shape", () => {
    const d = createDiagnostic("COOKLANG_E0201", { name: "flour" });
    expect(d).toMatchObject<Partial<Diagnostic>>({
      code: "COOKLANG_E0201",
      severity: "error",
    });
    expect(d.message).toContain("flour");
  });

  it("referencedCookwareNotFound returns correct shape", () => {
    const d = createDiagnostic("COOKLANG_E0202", { name: "pan" });
    expect(d).toMatchObject<Partial<Diagnostic>>({
      code: "COOKLANG_E0202",
      severity: "error",
    });
    expect(d.message).toContain("pan");
  });

  it("referencedItemRedefined returns correct shape", () => {
    const d = createDiagnostic("COOKLANG_E0203", {
      itemType: "ingredient",
      name: "sugar",
      flag: "hidden",
    });
    expect(d).toMatchObject<Partial<Diagnostic>>({
      code: "COOKLANG_E0203",
      severity: "error",
    });
    expect(d.message).toContain("sugar");
    expect(d.message).toContain("hidden");
  });

  it("noTabIndent returns correct shape", () => {
    const d = createDiagnostic("COOKLANG_E0301", {});
    expect(d).toMatchObject<Partial<Diagnostic>>({
      code: "COOKLANG_E0301",
      severity: "error",
    });
  });

  it("badIndentation returns correct shape", () => {
    const d = createDiagnostic("COOKLANG_E0302", {});
    expect(d).toMatchObject<Partial<Diagnostic>>({
      code: "COOKLANG_E0302",
      severity: "error",
    });
  });

  it("attaches a span when provided", () => {
    const span = {
      start: { offset: 4, line: 1, column: 5 },
      end: { offset: 16, line: 1, column: 17 },
    };
    const d = createDiagnostic("COOKLANG_E0101", { value: "%two" }, span);
    expect(d.span).toEqual(span);
  });
});

describe("Recipe.parse() diagnostics", () => {
  it("has empty diagnostics for clean recipe", () => {
    const result = parseCollect(new Recipe(), "Add @flour{100%g}");
    expect(result.diagnostics).toHaveLength(0);
  });

  it("maps spans to the original source across metadata and skipped lines", () => {
    const content = [
      "---",
      "title: Test",
      "---",
      "",
      "== Mixing ==",
      "[vegan] Add @flour{%two}",
    ].join("\n");
    const result = parseCollect(new Recipe(), content);
    const diagnostic = result.diagnostics[0]!;
    const token = "@flour{%two}";
    const startOffset = content.indexOf(token);

    expect(result.source).toBe(content);
    expect(diagnostic.span).toEqual({
      start: { offset: startOffset, line: 6, column: 13 },
      end: {
        offset: startOffset + token.length,
        line: 6,
        column: 13 + token.length,
      },
    });
  });

  it("replaces all parsed state when parsing again", () => {
    const recipe = new Recipe("---\ntitle: First\n---\nAdd @flour{1}");

    recipe.parse("Use #pan{} for ~{5%minutes}");

    expect(recipe.metadata).toEqual({});
    expect(recipe.ingredients).toEqual([]);
    expect(recipe.cookware).toHaveLength(1);
    expect(recipe.timers).toHaveLength(1);
    expect(recipe.sections).toHaveLength(1);
  });

  it("collects COOKLANG_E0202 diagnostic", () => {
    const result = parseCollect(new Recipe(), "Use #&nonexistent-pan{}");
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject<Partial<Diagnostic>>({
      code: "COOKLANG_E0202",
      severity: "error",
    });
    expect(result.diagnostics[0]!.message).toContain("nonexistent-pan");
  });

  it("collects COOKLANG_E0301 diagnostic for tab in metadata", () => {
    // A leading space followed by a tab is captured by nestedMetaVarRegex
    // and triggers NoTabAsIndentError in parseNestedBlock
    const content = "---\nsource:\n \t name: NYT\n---\nAdd @flour{100%g}";
    const result = parseCollect(new Recipe(), content);
    const offset = content.indexOf("\t");
    expect(result.diagnostics[0]).toMatchObject({
      code: "COOKLANG_E0301",
      span: {
        start: { offset, line: 3, column: 2 },
        end: { offset: offset + 1, line: 3, column: 3 },
      },
    });
  });

  it("collects COOKLANG_E0302 diagnostic for inconsistent metadata indentation", () => {
    // Two keys at different indentation levels at the same nesting depth
    const content =
      "---\nsource:\n  name: NYT\n    url: http://x\n---\nAdd @flour";
    const result = parseCollect(new Recipe(), content);
    const offset = content.indexOf("    url:");
    expect(result.diagnostics[0]).toMatchObject({
      code: "COOKLANG_E0302",
      span: {
        start: { offset, line: 4, column: 1 },
        end: { offset: offset + 4, line: 4, column: 5 },
      },
    });
  });

  it("attaches accurate span to COOKLANG_E0101 diagnostic", () => {
    const result = parseCollect(new Recipe(), "Add @flour{%two}");
    const diag = result.diagnostics[0]!;
    expect(diag.span).toBeDefined();
    expect(diag.span!.start.line).toBe(1);
    expect(diag.span!.start.column).toBeGreaterThan(1);
  });

  it("collects multiple diagnostics for multiple errors", () => {
    const content = "Add @&flour and use #&pan and cook for ~{5}";
    const result = parseCollect(new Recipe(), content);
    expect(result.diagnostics.length).toBeGreaterThan(1);
  });

  it("collects invalid quantities in multiline notes and continues parsing", () => {
    const content = [
      "> First line",
      "> Scale {{bad%g}} now",
      "",
      "Add @flour{1}",
    ].join("\n");
    const token = "{{bad%g}}";
    const startOffset = content.indexOf(token);
    const recipe = new Recipe();
    const result = parseCollect(recipe, content);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject<Diagnostic>({
      code: "COOKLANG_E0101",
      message: expect.stringContaining("bad%g") as string,
      fix: expect.any(String) as string,
      docs: expect.any(String) as string,
      severity: "error",
      span: {
        start: { offset: startOffset, line: 2, column: 9 },
        end: {
          offset: startOffset + token.length,
          line: 2,
          column: 9 + token.length,
        },
      },
    });
    expect(result.output.ingredients).toMatchObject([{ name: "flour" }]);
  });

  it("keeps diagnostics on the instance after a throwing parse", () => {
    const recipe = new Recipe();
    const result = parseCollect(recipe, "Add @&flour{100%g}");
    expect(result.diagnostics).toHaveLength(1);
    expect(recipe.diagnostics).toBe(result.diagnostics);
  });
});

describe("Recipe.parse() throwing", () => {
  it("throws DiagnosticError when there are error-severity diagnostics", () => {
    expect(() => new Recipe().parse("Add @flour{%two}")).toThrow(
      DiagnosticError,
    );
  });

  it("DiagnosticError carries diagnostics and source", () => {
    let thrown: DiagnosticError | undefined;
    try {
      new Recipe().parse("Add @flour{%two}");
    } catch (e) {
      if (e instanceof DiagnosticError) thrown = e;
    }
    expect(thrown).toBeDefined();
    expect(thrown!.diagnostics).toHaveLength(1);
    expect(thrown!.diagnostics[0]!.code).toBe("COOKLANG_E0101");
    expect(thrown!.source).toBe("Add @flour{%two}");
  });

  it("does not throw for a clean recipe", () => {
    expect(() => new Recipe().parse("Add @flour{100%g}")).not.toThrow();
  });

  it("error message summarizes error count", () => {
    let thrown: DiagnosticError | undefined;
    try {
      new Recipe().parse("@&a and @&b");
    } catch (e) {
      if (e instanceof DiagnosticError) thrown = e;
    }
    expect(thrown!.message).toContain("2 errors");
  });

  it("DiagnosticError snapshots all diagnostics but counts only errors", () => {
    const diagnostics: Diagnostic[] = [
      {
        code: "COOKLANG_W0101",
        message: "Warning",
        severity: "warning",
      },
      {
        code: "COOKLANG_E0101",
        message: "Error",
        severity: "error",
      },
    ];
    const error = new DiagnosticError(diagnostics, "source");

    diagnostics.length = 0;

    expect(error.message).toContain("1 error");
    expect(error.diagnostics).toHaveLength(2);
  });
});
