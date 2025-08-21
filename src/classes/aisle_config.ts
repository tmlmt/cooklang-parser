import type { AisleCategory, AisleIngredient } from "../types";

/**
 * Represents the aisle configuration for a shopping list.
 * @category Classes
 */
export class AisleConfig {
  /**
   * The categories of aisles.
   * @see {@link AisleCategory}
   */
  categories: AisleCategory[] = [];

  /**
   * Creates a new AisleConfig instance.
   * @param config - The aisle configuration to parse.
   */
  constructor(config?: string) {
    if (config) {
      this.parse(config);
    }
  }

  /**
   * Parses an aisle configuration from a string.
   * @param config - The aisle configuration to parse.
   */
  parse(config: string) {
    let currentCategory: AisleCategory | null = null;
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

        const ingredient: AisleIngredient = {
          name: aliases[0]!, // We know this exists because trimmedLine is not empty
          aliases: aliases,
        };
        currentCategory.ingredients.push(ingredient);
      }
    }
  }
}
