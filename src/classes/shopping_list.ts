import { CategoryConfig } from "./category_config";
import { Recipe } from "./recipe";
import type {
  CategorizedIngredients,
  AddedRecipe,
  AddedIngredient,
  QuantityWithExtendedUnit,
  QuantityWithPlainUnit,
  MaybeNestedGroup,
  FlatOrGroup,
  AddedRecipeOptions,
} from "../types";
import { addEquivalentsAndSimplify } from "../quantities/alternatives";
import { extendAllUnits } from "../quantities/mutations";
import { isAndGroup } from "../utils/type_guards";

/**
 * Shopping List generator.
 *
 * ## Usage
 *
 * - Create a new ShoppingList instance with an optional category configuration (see {@link ShoppingList."constructor" | constructor})
 * - Add recipes, scaling them as needed (see {@link ShoppingList.add_recipe | add_recipe()})
 * - Categorize the ingredients (see {@link ShoppingList.categorize | categorize()})
 *
 * @example
 *
 * ```typescript
 * import * as fs from "fs";
 * import { ShoppingList } from @tmlmt/cooklang-parser;
 *
 * const categoryConfig = fs.readFileSync("./myconfig.txt", "utf-8")
 * const recipe1 = new Recipe(fs.readFileSync("./myrecipe.cook", "utf-8"));
 * const shoppingList = new ShoppingList();
 * shoppingList.set_category_config(categoryConfig);
 * // Quantities are automatically calculated and ingredients categorized
 * // when adding a recipe
 * shoppingList.add_recipe(recipe1);
 * ```
 *
 * @category Classes
 */
export class ShoppingList {
  // TODO: backport type change
  /**
   * The ingredients in the shopping list.
   */
  ingredients: AddedIngredient[] = [];
  /**
   * The recipes in the shopping list.
   */
  recipes: AddedRecipe[] = [];
  /**
   * The category configuration for the shopping list.
   */
  category_config?: CategoryConfig;
  /**
   * The categorized ingredients in the shopping list.
   */
  categories?: CategorizedIngredients;

  /**
   * Creates a new ShoppingList instance
   * @param category_config_str - The category configuration to parse.
   */
  constructor(category_config_str?: string | CategoryConfig) {
    if (category_config_str) {
      this.set_category_config(category_config_str);
    }
  }

  private calculate_ingredients() {
    this.ingredients = [];

    const addIngredientQuantity = (
      name: string,
      quantityTotal:
        | QuantityWithPlainUnit
        | MaybeNestedGroup<QuantityWithPlainUnit>,
    ) => {
      const quantityTotalExtended = extendAllUnits(quantityTotal);
      const newQuantities = (
        isAndGroup(quantityTotalExtended)
          ? quantityTotalExtended.and
          : [quantityTotalExtended]
      ) as (QuantityWithExtendedUnit | FlatOrGroup<QuantityWithExtendedUnit>)[];
      const existing = this.ingredients.find((i) => i.name === name);

      if (existing) {
        if (!existing.quantityTotal) {
          existing.quantityTotal = quantityTotal;
          return;
        }
        try {
          const existingQuantityTotalExtended = extendAllUnits(
            existing.quantityTotal,
          );
          const existingQuantities = (
            isAndGroup(existingQuantityTotalExtended)
              ? existingQuantityTotalExtended.and
              : [existingQuantityTotalExtended]
          ) as (
            | QuantityWithExtendedUnit
            | FlatOrGroup<QuantityWithExtendedUnit>
          )[];
          existing.quantityTotal = addEquivalentsAndSimplify([
            ...existingQuantities,
            ...newQuantities,
          ]);
          return;
        } catch {
          // Incompatible
        }
      }

      this.ingredients.push({
        name,
        quantityTotal,
      });
    };

    for (const addedRecipe of this.recipes) {
      let scaledRecipe: Recipe;
      if ("factor" in addedRecipe) {
        const { recipe, factor } = addedRecipe;
        scaledRecipe = factor === 1 ? recipe : recipe.scaleBy(factor);
      } else {
        scaledRecipe = addedRecipe.recipe.scaleTo(addedRecipe.servings);
      }

      // Get computed ingredients with total quantities based on choices (or default)
      const ingredients = scaledRecipe.getIngredientQuantities({
        choices: addedRecipe.choices,
      });

      for (const ingredient of ingredients) {
        // Do not add hidden ingredients to the shopping list
        if (ingredient.flags && ingredient.flags.includes("hidden")) {
          continue;
        }

        // Only add ingredients that were selected (have usedAsPrimary flag)
        // This filters out alternative ingredients that weren't chosen
        if (!ingredient.usedAsPrimary) {
          continue;
        }

        // Sum up quantities from the ingredient's quantity groups
        if (ingredient.quantities && ingredient.quantities.length > 0) {
          // Extract all quantities (converting to plain units for summing)
          const allQuantities: (
            | QuantityWithPlainUnit
            | MaybeNestedGroup<QuantityWithPlainUnit>
          )[] = [];
          for (const qGroup of ingredient.quantities) {
            if ("and" in qGroup) {
              // AndGroup - add each quantity separately
              for (const qty of qGroup.and) {
                allQuantities.push(qty);
              }
            } else {
              // Simple quantity (strip alternatives - choices already applied)
              const plainQty: QuantityWithPlainUnit = {
                quantity: qGroup.quantity,
              };
              if (qGroup.unit) plainQty.unit = qGroup.unit;
              if (qGroup.equivalents) plainQty.equivalents = qGroup.equivalents;
              allQuantities.push(plainQty);
            }
          }
          if (allQuantities.length === 1) {
            addIngredientQuantity(ingredient.name, allQuantities[0]!);
          } else {
            // allQuantities.length > 1
            // Sum up using addEquivalentsAndSimplify
            const extendedQuantities = allQuantities.map((q) =>
              extendAllUnits(q),
            );
            const totalQuantity = addEquivalentsAndSimplify(
              extendedQuantities as (
                | QuantityWithExtendedUnit
                | FlatOrGroup<QuantityWithExtendedUnit>
              )[],
            );
            // addEquivalentsAndSimplify already returns plain units
            addIngredientQuantity(ingredient.name, totalQuantity);
          }
        } else if (!this.ingredients.some((i) => i.name === ingredient.name)) {
          this.ingredients.push({ name: ingredient.name });
        }
      }
    }
  }

  /**
   * Adds a recipe to the shopping list, then automatically
   * recalculates the quantities and recategorize the ingredients.
   * @param recipe - The recipe to add.
   * @param options - Options for adding the recipe.
   * @throws Error if the recipe has alternatives without corresponding choices.
   */
  add_recipe(recipe: Recipe, options: AddedRecipeOptions = {}): void {
    // Validate that choices are provided for all alternatives
    const errorMessage = this.getUnresolvedAlternativesError(
      recipe,
      options.choices,
    );
    if (errorMessage) {
      throw new Error(errorMessage);
    }

    if (!options.scaling) {
      this.recipes.push({
        recipe,
        factor: options.scaling ?? 1,
        choices: options.choices,
      });
    } else {
      if ("factor" in options.scaling) {
        this.recipes.push({
          recipe,
          factor: options.scaling.factor,
          choices: options.choices,
        });
      } else {
        this.recipes.push({
          recipe,
          servings: options.scaling.servings,
          choices: options.choices,
        });
      }
    }
    this.calculate_ingredients();
    this.categorize();
  }

  /**
   * Checks if a recipe has unresolved alternatives (alternatives without provided choices).
   * @param recipe - The recipe to check.
   * @param choices - The choices provided for the recipe.
   * @returns An error message if there are unresolved alternatives, undefined otherwise.
   */
  private getUnresolvedAlternativesError(
    recipe: Recipe,
    choices?: import("../types").RecipeChoices,
  ): string | undefined {
    const missingItems: string[] = [];
    const missingGroups: string[] = [];

    // Check for inline alternatives without choices
    for (const itemId of recipe.choices.ingredientItems.keys()) {
      if (!choices?.ingredientItems?.has(itemId)) {
        missingItems.push(itemId);
      }
    }

    // Check for grouped alternatives without choices
    for (const groupId of recipe.choices.ingredientGroups.keys()) {
      if (!choices?.ingredientGroups?.has(groupId)) {
        missingGroups.push(groupId);
      }
    }

    if (missingItems.length === 0 && missingGroups.length === 0) {
      return undefined;
    }

    const parts: string[] = [];
    if (missingItems.length > 0) {
      parts.push(
        `ingredientItems: [${missingItems.map((i) => `'${i}'`).join(", ")}]`,
      );
    }
    if (missingGroups.length > 0) {
      parts.push(
        `ingredientGroups: [${missingGroups.map((g) => `'${g}'`).join(", ")}]`,
      );
    }
    return `Recipe has unresolved alternatives. Missing choices for: ${parts.join(", ")}`;
  }

  /**
   * Removes a recipe from the shopping list, then automatically
   * recalculates the quantities and recategorize the ingredients.s
   * @param index - The index of the recipe to remove.
   */
  remove_recipe(index: number) {
    if (index < 0 || index >= this.recipes.length) {
      throw new Error("Index out of bounds");
    }
    this.recipes.splice(index, 1);
    this.calculate_ingredients();
    this.categorize();
  }

  /**
   * Sets the category configuration for the shopping list
   * and automatically categorize current ingredients from the list.
   * @param config - The category configuration to parse.
   */
  set_category_config(config: string | CategoryConfig) {
    if (typeof config === "string")
      this.category_config = new CategoryConfig(config);
    else if (config instanceof CategoryConfig) this.category_config = config;
    else throw new Error("Invalid category configuration");
    this.categorize();
  }

  /**
   * Categorizes the ingredients in the shopping list
   * Will use the category config if any, otherwise all ingredients will be placed in the "other" category
   */
  categorize() {
    if (!this.category_config) {
      this.categories = { other: this.ingredients };
      return;
    }

    const categories: CategorizedIngredients = { other: [] };
    for (const category of this.category_config.categories) {
      categories[category.name] = [];
    }

    for (const ingredient of this.ingredients) {
      let found = false;
      for (const category of this.category_config.categories) {
        for (const categoryIngredient of category.ingredients) {
          if (categoryIngredient.aliases.includes(ingredient.name)) {
            categories[category.name]!.push(ingredient);
            found = true;
            break;
          }
        }
        if (found) {
          break;
        }
      }
      if (!found) {
        categories.other!.push(ingredient);
      }
    }

    this.categories = categories;
  }
}
