import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  Recipe,
  Pantry,
  ProductCatalog,
  ShoppingList,
  SingleDiagnosticError,
  DiagnosticError,
  InternalError,
  diagnosticCatalog,
  severityOfCode,
} from "../src/index";
import * as errors from "../src/errors";
import { parseCollect } from "./mocks/parse_collect";
import type { DiagnosticCode } from "../src/types";

const codes = Object.keys(diagnosticCatalog) as DiagnosticCode[];

describe("diagnostic catalog", () => {
  it("uses the COOKLANG_<E|W><4 digits> naming convention", () => {
    for (const code of codes) expect(code).toMatch(/^COOKLANG_[EWI]\d{4}$/);
  });

  it("derives the severity from the code letter", () => {
    expect(severityOfCode("COOKLANG_E0101")).toBe("error");
    expect(severityOfCode("COOKLANG_W0101")).toBe("warning");
    expect(severityOfCode("COOKLANG_I0001")).toBe("error");
  });

  it("has a documentation page for every code", () => {
    const dir = join(__dirname, "../docs/e/codes");
    const pages = readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""));
    expect(pages.sort()).toEqual([...codes].sort());
    for (const code of codes) {
      const md = readFileSync(join(dir, `${code}.md`), "utf8");
      expect(md).toContain(`code: ${code}`);
      expect(md).toContain(`level: ${severityOfCode(code)}`);
    }
  });

  it("points docs links to the v3 error pages", () => {
    const d = new errors.IndexOutOfBoundsError().diagnostic;
    expect(d.docs).toBe(
      "https://cooklang-parser.tmlmt.com/v3/e/cooklang_e9502",
    );
  });
});

describe("source code", () => {
  it("never throws anonymous Errors", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? walk(join(dir, e.name))
          : e.name.endsWith(".ts")
            ? [join(dir, e.name)]
            : [],
      );
    for (const file of walk(join(__dirname, "../src"))) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(
        /throw\s+(new\s+)?Error\b/,
      );
    }
  });
});

describe("typed errors", () => {
  it("all extend SingleDiagnosticError with a code and diagnostic", () => {
    const instances = [
      new errors.InternalError("x"),
      new errors.RatioNotComputableError(),
      new errors.InvalidPantryError(),
      new errors.InvalidCategoryConfigError(),
      new errors.InvalidDateError("bad"),
      new errors.InvalidPantryTomlError("bad"),
      new errors.InvalidProductCatalogTomlError("bad"),
      new errors.NoProductMatchError("flour", "noProduct"),
      new errors.IncompatibleUnitsError("a", "b"),
      new errors.UnknownRecipePathError("p"),
    ];
    for (const e of instances) {
      expect(e).toBeInstanceOf(SingleDiagnosticError);
      expect(e.code).toBe(e.diagnostic.code);
      expect(e.diagnostic.fix).toBeDefined();
    }
    expect(new InternalError("boom").message).toBe("boom");
    expect(new errors.NoProductMatchError("flour", "noQuantity").reason).toBe(
      "noQuantity",
    );
  });

  it("wraps TOML syntax errors of pantry and product catalog", () => {
    expect(() => new Pantry("[a\nb=")).toThrow(DiagnosticError);
    expect(() => new ProductCatalog("[a\nb=")).toThrow(DiagnosticError);
  });

  it("wraps invalid arguments of ShoppingList", () => {
    const list = new ShoppingList();
    expect(() => list.addPantry(42 as never)).toThrow(
      errors.InvalidPantryError,
    );
    expect(() => list.setCategoryConfig(42 as never)).toThrow(
      errors.InvalidCategoryConfigError,
    );
  });
});

describe("warnings", () => {
  it("warns on non-numeric servings without throwing", () => {
    const source = "---\nservings: many\n---\nAdd @flour{1}";
    const result = parseCollect(new Recipe(), source);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      code: "COOKLANG_W0301",
      severity: "warning",
      span: { start: { line: 2, column: 1 } },
    });
    expect(() => new Recipe().parse(source)).not.toThrow();
  });

  it("emits a single servings warning for the winning key", () => {
    const both = parseCollect(
      new Recipe(),
      "---\nserves: few\nservings: many\n---\nAdd @flour{1}",
    );
    expect(both.diagnostics).toHaveLength(1);
    expect(both.diagnostics[0]).toMatchObject({
      code: "COOKLANG_W0301",
      span: { start: { line: 3, column: 1 } },
    });

    const serveOnly = parseCollect(
      new Recipe(),
      "---\nserves: few\n---\nAdd @flour{1}",
    );
    expect(serveOnly.diagnostics).toMatchObject([{ code: "COOKLANG_W0301" }]);

    const numericWins = parseCollect(
      new Recipe(),
      "---\nserves: few\nservings: 2\n---\nAdd @flour{1}",
    );
    expect(numericWins.diagnostics).toHaveLength(0);
  });

  it("warns on unterminated block comments", () => {
    const result = parseCollect(new Recipe(), "Mix [- oops\nstill going");
    expect(result.diagnostics).toMatchObject([
      {
        code: "COOKLANG_W0101",
        severity: "warning",
        span: { start: { line: 1, column: 5 } },
      },
    ]);
  });

  it("does not warn on closed block comments", () => {
    expect(new Recipe("Mix [- ok -] now").diagnostics).toEqual([]);
  });
});
