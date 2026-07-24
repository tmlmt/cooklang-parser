import { describe, it, expect } from "vitest";
import {
  invalidQuantityDiagnostic,
  timerMissingUnitDiagnostic,
  referencedIngredientNotFoundDiagnostic,
  referencedCookwareNotFoundDiagnostic,
  referencedItemRedefinedDiagnostic,
  noTabIndentDiagnostic,
  badIndentationDiagnostic,
  metadataParseErrorDiagnostic,
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

  it("metadataParseErrorDiagnostic returns correct shape", () => {
    const d = metadataParseErrorDiagnostic({
      detail: "Invalid date value",
    });
    expect(d).toMatchObject<Partial<CooklangParseDiagnostic>>({
      code: "metadata-parse-error",
      severity: "error",
    });
    expect(d.message).toBe("Invalid date value");
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
    const result = new Recipe("Add @flour{100%g}").parse("Add @flour{100%g}");
    expect(result.diagnostics).toHaveLength(0);
    expect(result.source).toBe("Add @flour{100%g}");
    expect(result.recipe).toBeInstanceOf(Recipe);
  });

  it("collects referenced-cookware-not-found diagnostic", () => {
    const recipe = new Recipe("Use #&nonexistent-pan{}");
    expect(recipe.diagnostics).toHaveLength(1);
    expect(recipe.diagnostics[0]).toMatchObject<Partial<CooklangParseDiagnostic>>(
      {
        code: "referenced-cookware-not-found",
        severity: "error",
      },
    );
    expect(recipe.diagnostics[0]!.message).toContain("nonexistent-pan");
  });

  it("collects no-tab-indent diagnostic for tab in metadata", () => {
    // A leading space followed by a tab is captured by nestedMetaVarRegex
    // and triggers NoTabAsIndentError in parseNestedBlock
    const content = "---\nsource:\n \t name: NYT\n---\nAdd @flour{100%g}";
    const recipe = new Recipe(content);
    expect(
      recipe.diagnostics.some((d) => d.code === "no-tab-indent"),
    ).toBe(true);
  });

  it("collects bad-indentation diagnostic for inconsistent metadata indentation", () => {
    // Two keys at different indentation levels at the same nesting depth
    const content = "---\nsource:\n  name: NYT\n    url: http://x\n---\nAdd @flour";
    const recipe = new Recipe(content);
    expect(
      recipe.diagnostics.some((d) => d.code === "bad-indentation"),
    ).toBe(true);
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
});
