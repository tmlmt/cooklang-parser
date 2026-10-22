import type { Category, CategoryIngredient, Diagnostic } from "../types";
import { buildLineOffsets, makeSpan } from "../utils/diagnostics_spans";
import {
  DiagnosticError,
  DuplicateCategoryError,
  IngredientWithoutCategoryError,
  DuplicateIngredientAliasError,
  type SingleDiagnosticError,
} from "../errors";

/**
 * Parser for category configurations specified à-la-cooklang.
 *
 * ## Usage
 *
 * You can either directly provide the category configuration string when creating the instance
 * e.g. `const categoryConfig = new CategoryConfig(<...>)`, or create it first and then pass
 * the category configuration string to the {@link CategoryConfig.parse | parse()} method.
 *
 * The initialized `CategoryConfig` can then be fed to a {@link ShoppingList}
 *
 * @example
 * ```typescript
 * import { CategoryConfig } from @tmlmt/cooklang-parser;
 *
 * const categoryConfigString = `
 * [Dairy]
 * milk
 * butter
 *
 * [Bakery]
 * flour
 * sugar`;
 *
 * const categoryConfig = new CategoryConfig(categoryConfigString);
 * ```
 *
 * @see [Category Configuration](https://cooklang.org/docs/spec/#shopping-lists) section of the cooklang specs
 *
 * @category Classes
 */
export class CategoryConfig {
  /**
   * The parsed categories of ingredients.
   */
  categories: Category[] = [];

  /** Diagnostics collected by the last {@link CategoryConfig.parse | parse()}. */
  diagnostics: Diagnostic[] = [];

  /** Source text of the last parse; diagnostic spans refer to it. */
  source = "";

  /**
   * Creates a new CategoryConfig instance.
   * @param config - The category configuration to parse.
   */
  constructor(config?: string) {
    if (config) {
      this.parse(config);
    }
  }

  /**
   * Parses a category configuration from a string into property
   *   {@link CategoryConfig.categories | categories}
   *
   * All problems are collected in {@link CategoryConfig.diagnostics}.
   *
   * @param config - The category configuration to parse.
   * @throws {@link DiagnosticError} if error-severity diagnostics exist.
   */
  parse(config: string): void {
    this.source = config;
    this.diagnostics = this._parseAndCollect(config).map((e) => e.diagnostic);
    if (this.diagnostics.some((d) => d.severity === "error")) {
      throw new DiagnosticError(this.diagnostics, config);
    }
  }

  private _parseAndCollect(config: string): SingleDiagnosticError[] {
    const errors: SingleDiagnosticError[] = [];
    this.categories = [];
    const lineOffsets = buildLineOffsets(config);
    let currentCategory: Category | null = null;
    const categoryNames = new Set<string>();
    const ingredientNames = new Set<string>();

    const report = (
      error: SingleDiagnosticError,
      line: string,
      lineIdx: number,
    ) => {
      const column = line.length - line.trimStart().length;
      error.diagnostic.span = makeSpan(
        lineOffsets,
        lineIdx,
        column,
        line.trim().length,
      );
      errors.push(error);
    };

    const lines = config.split(/\r\n|\r|\n/);
    for (const [lineIdx, line] of lines.entries()) {
      const trimmedLine = line.trim();

      if (trimmedLine.length === 0) {
        continue;
      }

      if (trimmedLine.startsWith("[") && trimmedLine.endsWith("]")) {
        const categoryName = trimmedLine
          .substring(1, trimmedLine.length - 1)
          .trim();

        if (categoryNames.has(categoryName)) {
          report(new DuplicateCategoryError(categoryName), line, lineIdx);
          // Detached category so that its ingredients don't cascade into errors
          currentCategory = { name: categoryName, ingredients: [] };
          continue;
        }
        categoryNames.add(categoryName);

        currentCategory = { name: categoryName, ingredients: [] };
        this.categories.push(currentCategory);
      } else {
        if (currentCategory === null) {
          report(
            new IngredientWithoutCategoryError(trimmedLine),
            line,
            lineIdx,
          );
          continue;
        }

        const aliases = trimmedLine.split("|").map((s) => s.trim());
        const duplicate = aliases.find(
          (alias, i) =>
            ingredientNames.has(alias) || aliases.indexOf(alias) < i,
        );
        if (duplicate !== undefined) {
          report(new DuplicateIngredientAliasError(duplicate), line, lineIdx);
          continue;
        }
        for (const alias of aliases) ingredientNames.add(alias);

        const ingredient: CategoryIngredient = {
          name: aliases[0]!, // We know this exists because trimmedLine is not empty
          aliases: aliases,
        };
        currentCategory.ingredients.push(ingredient);
      }
    }
    return errors;
  }
}
