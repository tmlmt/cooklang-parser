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

  it("referencedCookwarePropsDoNotMatch returns correct shape", () => {
    const d = createDiagnostic("COOKLANG_E0203", { name: "sugar" });
    expect(d).toMatchObject<Partial<Diagnostic>>({
      code: "COOKLANG_E0203",
      severity: "error",
    });
    expect(d.message).toContain("sugar");
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

  it("keeps two text quantities separate without a warning", () => {
    const result = parseCollect(
      new Recipe(),
      "Add @salt{a pinch}.\nAdd @&salt{to taste}.",
    );

    expect(result.diagnostics).toHaveLength(0);
    const quantities = result.output.ingredients[0]?.quantities ?? [];
    expect(quantities).toHaveLength(2);
    expect(quantities[0]).toMatchObject({
      quantity: {
        type: "fixed",
        value: { type: "text", text: "a pinch" },
      },
    });
    expect(quantities[1]).toMatchObject({
      quantity: {
        type: "fixed",
        value: { type: "text", text: "to taste" },
      },
    });
  });

  it("keeps mixed numeric and text quantities separate and collects a warning", () => {
    const result = parseCollect(
      new Recipe(),
      "Add @salt{a pinch}.\nAdd @&salt{2}.",
    );

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics).toHaveDiagnostic("COOKLANG_W0401", {
      match: {
        severity: "warning",
      },
    });
    const quantities = result.output.ingredients[0]?.quantities ?? [];
    expect(quantities).toHaveLength(2);
    expect(quantities[0]).toMatchObject({
      quantity: {
        type: "fixed",
        value: { type: "text", text: "a pinch" },
      },
    });
    expect(quantities[1]).toMatchObject({
      quantity: {
        type: "fixed",
        value: { type: "decimal", decimal: 2 },
      },
    });

    const result2 = parseCollect(
      new Recipe(),
      "Add @salt{2%g}.\nAdd @&salt{a pinch}.",
    );

    expect(result2.diagnostics).toHaveLength(1);
    expect(result2.diagnostics).toHaveDiagnostic("COOKLANG_W0401", {
      match: {
        severity: "warning",
      },
    });
    const quantities2 = result2.output.ingredients[0]?.quantities ?? [];
    expect(quantities2).toHaveLength(2);
    expect(quantities2[0]).toMatchObject({
      quantity: {
        type: "fixed",
        value: { type: "decimal", decimal: 2 },
      },
      unit: "g",
    });
    expect(quantities2[1]).toMatchObject({
      quantity: {
        type: "fixed",
        value: { type: "text", text: "a pinch" },
      },
    });
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
    expect(result.diagnostics).toHaveDiagnostic("COOKLANG_E0202", {
      match: {
        severity: "error",
      },
    });
    expect(result.diagnostics[0]!.message).toContain("nonexistent-pan");
  });

  it("collects COOKLANG_E0301 diagnostic for tab in metadata", () => {
    // A leading space followed by a tab is captured by nestedMetaVarRegex
    // and triggers NoTabAsIndentError in parseNestedBlock
    const content = "---\nsource:\n \t name: NYT\n---\nAdd @flour{100%g}";
    const result = parseCollect(new Recipe(), content);
    const offset = content.indexOf("\t");
    expect(result.diagnostics).toHaveDiagnostic("COOKLANG_E0301", {
      match: {
        span: {
          start: { offset, line: 3, column: 2 },
          end: { offset: offset + 1, line: 3, column: 3 },
        },
      },
    });
  });

  it("collects COOKLANG_E0302 diagnostic for inconsistent metadata indentation", () => {
    // Two keys at different indentation levels at the same nesting depth
    const content =
      "---\nsource:\n  name: NYT\n    url: http://x\n---\nAdd @flour";
    const result = parseCollect(new Recipe(), content);
    const offset = content.indexOf("    url:");
    expect(result.diagnostics).toHaveDiagnostic("COOKLANG_E0302", {
      match: {
        span: {
          start: { offset, line: 4, column: 1 },
          end: { offset: offset + 4, line: 4, column: 5 },
        },
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
    expect(result.diagnostics).toHaveDiagnostic("COOKLANG_E0101", {
      match: {
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
  it("throws DiagnosticError when there is a fatal diagnostic", () => {
    let thrown: DiagnosticError | undefined;
    try {
      new Recipe().parse("Add @flour{1/0}");
    } catch (e) {
      if (e instanceof DiagnosticError) thrown = e;
    }
    expect(thrown).toBeDefined();
    expect(thrown!.diagnostics).toHaveDiagnostic("COOKLANG_E9402");
    expect(thrown!.source).toBe("Add @flour{1/0}");
  });

  it("does not throw for non-fatal errors and keeps the partial result", () => {
    const recipe = new Recipe();
    expect(() => recipe.parse("Add @flour{%two} and @salt")).not.toThrow();
    expect(recipe.diagnostics).toHaveDiagnostic("COOKLANG_E0101");
    expect(recipe.ingredients.map((i) => i.name)).toEqual(["flour", "salt"]);
  });

  it("DiagnosticError carries diagnostics and source", () => {});

  it("throws at the end of parsing when a fatal diagnostic was collected", () => {
    const recipe = new Recipe();
    Reflect.set(recipe, "_populateIngredientQuantities", () => {
      recipe.diagnostics.push(createDiagnostic("COOKLANG_E9402", {}));
    });

    expect(() => recipe.parse("Add @flour{%two}")).toThrow(DiagnosticError);
    expect(recipe.diagnostics).toHaveDiagnostic("COOKLANG_E0101");
    expect(recipe.diagnostics).toHaveDiagnostic("COOKLANG_E9402");
  });

  it("does not throw for a clean recipe", () => {
    expect(() => new Recipe().parse("Add @flour{100%g}")).not.toThrow();
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

  it("warns when an unreferenced ingredient repeats with the same flags and preparation", () => {
    const source = "Add @?salt{1%tsp}(ground), then add @?salt{2%tsp}(ground).";
    const result = parseCollect(new Recipe(), source);

    expect(result.diagnostics).toHaveDiagnostic("COOKLANG_W0201", {
      times: 1,
      match: {
        severity: "warning",
        span: {
          start: {
            offset: source.lastIndexOf("@?salt"),
            line: 1,
          },
        },
      },
    });
    expect(result.output.ingredients).toHaveLength(2);
  });

  it("does not warn when preparation or flags differ, or when the ingredient is referenced", () => {
    const result = parseCollect(
      new Recipe(),
      "Add @?salt{1%tsp}(ground), @salt{1%tsp}(ground), " +
        "@?salt{1%tsp}(crushed), then @&?salt{1%tsp}(ground).",
    );

    expect(result.diagnostics).not.toHaveDiagnostic("COOKLANG_W0201");
  });

  it("warns for duplicate ingredients added through group-key syntax", () => {
    const result = parseCollect(
      new Recipe(),
      "Add @|spices|salt{1%tsp}(ground) and @|spices|salt{2%tsp}(ground).",
    );

    expect(result.diagnostics).toHaveDiagnostic("COOKLANG_W0201", {
      times: 1,
    });
  });

  it("collects COOKLANG_E9401 with the source during final quantity aggregation", () => {
    const source = "Add @flour{1%cup|a bit}\nAdd @&flour{2%cup|a lot}";
    const recipe = new Recipe();
    let thrown: unknown;

    try {
      recipe.parse(source);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(DiagnosticError);
    expect(thrown).toMatchObject({
      source,
      diagnostics: [
        {
          code: "COOKLANG_E9401",
          severity: "error",
        },
      ],
    });
    expect(recipe.diagnostics).toEqual((thrown as DiagnosticError).diagnostics);
    expect(recipe.ingredients).toHaveLength(1);
    expect(recipe.sections).toHaveLength(1);
  });
});
