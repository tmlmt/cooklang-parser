import { describe, it, expect } from "vitest";
import {
  CategoryConfig,
  Pantry,
  ProductCatalog,
  DiagnosticError,
} from "../src/index";
import { parseCollect } from "./mocks/parse_collect";

describe("CategoryConfig.parse()", () => {
  it("returns no diagnostics for a valid config", () => {
    const cfg = new CategoryConfig();
    cfg.parse("[A]\nx|y\n[B]\nz");
    expect(cfg.diagnostics).toEqual([]);
    expect(cfg.categories).toHaveLength(2);
  });

  it("collects all problems with spans", () => {
    const config = "orphan\n[A]\nx\n[A]\nignored\n[B]\n  x|w  \nq|q";
    const r = parseCollect(new CategoryConfig(), config);
    expect(r.source).toBe(config);
    expect(r.diagnostics.map((d) => d.code)).toEqual([
      "COOKLANG_W0701",
      "COOKLANG_E0702",
      "COOKLANG_W0702",
      "COOKLANG_W0702",
    ]);
    expect(r.diagnostics[2]!.span).toMatchObject({
      start: { line: 7, column: 3 },
      end: { column: 6 },
    });
    expect(r.output.categories.map((c) => c.name)).toEqual(["A", "B"]);
  });

  it("constructor throws like parse() for fatal diagnostics", () => {
    expect(() => new CategoryConfig("[A]\n[A]")).toThrow(DiagnosticError);
  });

  it("constructor does not throw for warning-only diagnostics", () => {
    expect(() => new CategoryConfig("a")).not.toThrow();
    expect(() => new CategoryConfig("[A]\nx\ny|x")).not.toThrow();
  });
});

describe("Pantry.parse()", () => {
  it("reports TOML syntax errors with a span", () => {
    const r = parseCollect(new Pantry(), "[freezer]\nflour = ");
    expect(r.output.items).toEqual([]);
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0]).toMatchObject({
      code: "COOKLANG_E9701",
      severity: "error",
    });
    expect(r.diagnostics[0]!.span?.start.line).toBe(2);
  });

  it("omits items with invalid dates and keeps the others", () => {
    const toml = `[fridge]\nmilk = { quantity = "1%l", expire = "not-a-date" }\neggs = "6"`;
    const r = parseCollect(
      new Pantry(undefined, { dateFormat: "DD.MM.YYYY" }),
      toml,
    );
    expect(r.diagnostics.map((d) => d.code)).toEqual(["COOKLANG_E0701"]);
    expect(r.output.items.map((i) => i.name)).toEqual(["eggs"]);
  });

  it("constructor throws like parse()", () => {
    expect(() => new Pantry("[a]\nb = {", {})).toThrow(DiagnosticError);
  });
});

describe("ProductCatalog.parse()", () => {
  it("reports TOML syntax errors with a span", () => {
    const r = parseCollect(new ProductCatalog(), "[flour\n");
    expect(r.output.products).toEqual([]);
    expect(r.diagnostics[0]).toMatchObject({ code: "COOKLANG_E9601" });
    expect(r.diagnostics[0]!.span).toBeDefined();
  });

  it("reports invalid catalog format", () => {
    const r = parseCollect(new ProductCatalog(), "flour = 1");
    expect(r.diagnostics.map((d) => d.code)).toEqual(["COOKLANG_E9602"]);
  });

  it("returns products and no diagnostics for a valid catalog", () => {
    const catalog = new ProductCatalog();
    const products = catalog.parse(
      `[flour.f1]\nname = "Flour"\nsize = "1%kg"\nprice = 100`,
    );
    expect(catalog.diagnostics).toEqual([]);
    expect(products).toHaveLength(1);
  });
});
