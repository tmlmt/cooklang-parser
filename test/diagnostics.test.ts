import { describe, it, expect } from "vitest";
import {
  invalidQuantityDiagnostic,
  timerMissingUnitDiagnostic,
  referencedIngredientNotFoundDiagnostic,
  referencedCookwareNotFoundDiagnostic,
  referencedItemRedefinedDiagnostic,
  noTabIndentDiagnostic,
  badIndentationDiagnostic,
} from "../src/diagnostics";
import { Recipe, CooklangParseError } from "../src/index";
import type { CooklangParseDiagnostic } from "../src/types";

describe("diagnostic factory functions", () => {
  it("invalidQuantityDiagnostic returns correct shape", () => {
    const d = invalidQuantityDiagnostic({ value: "%two" });
    expect(d).toMatchObject<Partial<CooklangParseDiagnostic>>({
      code: "invalid-quantity",
      severity: "error",
    });
    expect(d.message).toContain("%two");
    expect(d.fix).toBeDefined();
    expect(d.docs).toContain("invalid-quantity");
    expect(d.span).toBeUndefined();
  });

  it("timerMissingUnitDiagnostic returns correct shape", () => {
    const d = timerMissingUnitDiagnostic();
    expect(d).toMatchObject<Partial<CooklangParseDiagnostic>>({
      code: "timer-missing-unit",
      severity: "error",
    });
    expect(d.fix).toBeDefined();
  });

  it("referencedIngredientNotFoundDiagnostic returns correct shape", () => {
    const d = referencedIngredientNotFoundDiagnostic({ name: "flour" });
    expect(d).toMatchObject<Partial<CooklangParseDiagnostic>>({
      code: "referenced-ingredient-not-found",
      severity: "error",
    });
    expect(d.message).toContain("flour");
  });

  it("referencedCookwareNotFoundDiagnostic returns correct shape", () => {
    const d = referencedCookwareNotFoundDiagnostic({ name: "pan" });
    expect(d).toMatchObject<Partial<CooklangParseDiagnostic>>({
      code: "referenced-cookware-not-found",
      severity: "error",
    });
    expect(d.message).toContain("pan");
  });

  it("referencedItemRedefinedDiagnostic returns correct shape", () => {
    const d = referencedItemRedefinedDiagnostic({
      itemType: "ingredient",
      name: "sugar",
      flag: "hidden",
    });
    expect(d).toMatchObject<Partial<CooklangParseDiagnostic>>({
      code: "referenced-item-redefined",
      severity: "error",
    });
    expect(d.message).toContain("sugar");
    expect(d.message).toContain("hidden");
  });

  it("noTabIndentDiagnostic returns correct shape", () => {
    const d = noTabIndentDiagnostic();
    expect(d).toMatchObject<Partial<CooklangParseDiagnostic>>({
      code: "no-tab-indent",
      severity: "error",
    });
  });

  it("badIndentationDiagnostic returns correct shape", () => {
    const d = badIndentationDiagnostic();
    expect(d).toMatchObject<Partial<CooklangParseDiagnostic>>({
      code: "bad-indentation",
      severity: "error",
    });
  });

  it("attaches a span when provided", () => {
    const span = {
      start: { offset: 4, line: 1, column: 5 },
      end: { offset: 16, line: 1, column: 17 },
    };
    const d = invalidQuantityDiagnostic({ value: "%two" }, span);
    expect(d.span).toEqual(span);
  });
});

describe("Recipe.parse() diagnostics", () => {
  it("returns ParseResult with source and empty diagnostics for clean recipe", () => {
    const result = new Recipe().parse("Add @flour{100%g}");
    expect(result.diagnostics).toHaveLength(0);
    expect(result.source).toBe("Add @flour{100%g}");
    expect(result.recipe).toBeInstanceOf(Recipe);
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
    const result = new Recipe().parse(content);
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

  it("collects referenced-cookware-not-found diagnostic", () => {
    const recipe = new Recipe("Use #&nonexistent-pan{}");
    expect(recipe.diagnostics).toHaveLength(1);
    expect(recipe.diagnostics[0]).toMatchObject<
      Partial<CooklangParseDiagnostic>
    >({
      code: "referenced-cookware-not-found",
      severity: "error",
    });
    expect(recipe.diagnostics[0]!.message).toContain("nonexistent-pan");
  });

  it("collects no-tab-indent diagnostic for tab in metadata", () => {
    // A leading space followed by a tab is captured by nestedMetaVarRegex
    // and triggers NoTabAsIndentError in parseNestedBlock
    const content = "---\nsource:\n \t name: NYT\n---\nAdd @flour{100%g}";
    const recipe = new Recipe(content);
    const offset = content.indexOf("\t");
    expect(recipe.diagnostics[0]).toMatchObject({
      code: "no-tab-indent",
      span: {
        start: { offset, line: 3, column: 2 },
        end: { offset: offset + 1, line: 3, column: 3 },
      },
    });
  });

  it("collects bad-indentation diagnostic for inconsistent metadata indentation", () => {
    // Two keys at different indentation levels at the same nesting depth
    const content =
      "---\nsource:\n  name: NYT\n    url: http://x\n---\nAdd @flour";
    const recipe = new Recipe(content);
    const offset = content.indexOf("    url:");
    expect(recipe.diagnostics[0]).toMatchObject({
      code: "bad-indentation",
      span: {
        start: { offset, line: 4, column: 1 },
        end: { offset: offset + 4, line: 4, column: 5 },
      },
    });
  });

  it("attaches accurate span to invalid-quantity diagnostic", () => {
    const recipe = new Recipe("Add @flour{%two}");
    const diag = recipe.diagnostics[0]!;
    expect(diag.span).toBeDefined();
    expect(diag.span!.start.line).toBe(1);
    expect(diag.span!.start.column).toBeGreaterThan(1);
  });

  it("collects multiple diagnostics for multiple errors", () => {
    const content = "Add @&flour and use #&pan and cook for ~{5}";
    const recipe = new Recipe(content);
    expect(recipe.diagnostics.length).toBeGreaterThan(1);
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
    const recipe = new Recipe(content);

    expect(recipe.diagnostics).toHaveLength(1);
    expect(recipe.diagnostics[0]).toMatchObject<CooklangParseDiagnostic>({
      code: "invalid-quantity",
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
    expect(recipe.ingredients).toMatchObject([{ name: "flour" }]);
  });

  it("parse() return value equals recipe.diagnostics", () => {
    const recipe = new Recipe();
    const result = recipe.parse("Add @&flour{100%g}");
    expect(result.diagnostics).toBe(recipe.diagnostics);
  });
});

describe("Recipe.parseOrThrow()", () => {
  it("throws CooklangParseError when there are error-severity diagnostics", () => {
    expect(() => Recipe.parseOrThrow("Add @flour{%two}")).toThrow(
      CooklangParseError,
    );
  });

  it("CooklangParseError carries diagnostics and source", () => {
    let thrown: CooklangParseError | undefined;
    try {
      Recipe.parseOrThrow("Add @flour{%two}");
    } catch (e) {
      if (e instanceof CooklangParseError) thrown = e;
    }
    expect(thrown).toBeDefined();
    expect(thrown!.diagnostics).toHaveLength(1);
    expect(thrown!.diagnostics[0]!.code).toBe("invalid-quantity");
    expect(thrown!.source).toBe("Add @flour{%two}");
  });

  it("does not throw for a clean recipe", () => {
    expect(() => Recipe.parseOrThrow("Add @flour{100%g}")).not.toThrow();
  });

  it("error message summarizes error count", () => {
    let thrown: CooklangParseError | undefined;
    try {
      Recipe.parseOrThrow("@&a and @&b");
    } catch (e) {
      if (e instanceof CooklangParseError) thrown = e;
    }
    expect(thrown!.message).toContain("2 errors");
  });

  it("CooklangParseError snapshots all diagnostics but counts only errors", () => {
    const diagnostics: CooklangParseDiagnostic[] = [
      {
        code: "warning-code",
        message: "Warning",
        severity: "warning",
      },
      {
        code: "error-code",
        message: "Error",
        severity: "error",
      },
    ];
    const error = new CooklangParseError(diagnostics, "source");

    diagnostics.length = 0;

    expect(error.message).toContain("1 error");
    expect(error.diagnostics).toHaveLength(2);
  });
});
