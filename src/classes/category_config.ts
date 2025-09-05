import type { Category, CategoryIngredient } from "../types";

/**
 * Parser for category configurations specified à-la-cooklang.
 *
 * ## Usage
 *
 * You can either directly provide the category configuration string when creating the instance
 * e.g. `const categoryConfig = new CategoryConfig(<...>)`, or create it first and then pass
 * the category configuration string to the {@link CategoryConfig.parse | parse()} method.
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
   * @param config - The category configuration to parse.
   */
  parse(config: string) {
    let currentCategory: Category | null = null;
    const categoryNames = new Set<string>();
    const ingredientNames = new Set<string>();

    for (const line of config.split("\n")) {
      const trimmedLine = line.trim();

      if (trimmedLine.length === 0) {
        continue;
      }

      if (trimmedLine.startsWith("[") && trimmedLine.endsWith("]")) {
        const categoryName = trimmedLine
          .substring(1, trimmedLine.length - 1)
          .trim();

        if (categoryNames.has(categoryName)) {
          throw new Error(`Duplicate category found: ${categoryName}`);
        }
        categoryNames.add(categoryName);

        currentCategory = { name: categoryName, ingredients: [] };
        this.categories.push(currentCategory);
      } else {
        if (currentCategory === null) {
          throw new Error(
            `Ingredient found without a category: ${trimmedLine}`,
          );
        }

        const aliases = trimmedLine.split("|").map((s) => s.trim());
        for (const alias of aliases) {
          if (ingredientNames.has(alias)) {
            throw new Error(`Duplicate ingredient/alias found: ${alias}`);
          }
          ingredientNames.add(alias);
        }

        const ingredient: CategoryIngredient = {
          name: aliases[0]!, // We know this exists because trimmedLine is not empty
          aliases: aliases,
        };
        currentCategory.ingredients.push(ingredient);
      }
    }
  }
}
