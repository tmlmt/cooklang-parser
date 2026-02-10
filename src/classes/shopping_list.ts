import { CategoryConfig } from "./category_config";
import { Pantry } from "./pantry";
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
  PantryOptions,
} from "../types";
import { addEquivalentsAndSimplify } from "../quantities/alternatives";
import {
  extendAllUnits,
  subtractQuantities,
  toExtendedUnit,
  toPlainUnit,
} from "../quantities/mutations";
import { isAndGroup, isOrGroup, isQuantity } from "../utils/type_guards";
import { deepClone } from "../utils/general";

/**
 * Shopping List generator.
 *
 * ## Usage
 *
 * - Create a new ShoppingList instance with an optional category configuration (see {@link ShoppingList."constructor" | constructor})
 * - Add recipes, scaling them as needed (see {@link ShoppingList.addRecipe | addRecipe()})
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
 * shoppingList.setCategoryConfig(categoryConfig);
 * // Quantities are automatically calculated and ingredients categorized
 * // when adding a recipe
 * shoppingList.addRecipe(recipe1);
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
  categoryConfig?: CategoryConfig;
  /**
   * The categorized ingredients in the shopping list.
   */
  categories?: CategorizedIngredients;
  /**
   * The original pantry (never mutated by recipe calculations).
   */
  pantry?: Pantry;
  /**
   * The pantry with quantities updated after subtracting recipe needs.
   * Recomputed on every {@link ShoppingList.calculateIngredients | calculateIngredients()} call.
   */
  private resultingPantry?: Pantry;

  /**
   * Creates a new ShoppingList instance
   * @param categoryConfigStr - The category configuration to parse.
   */
  constructor(categoryConfigStr?: string | CategoryConfig) {
    if (categoryConfigStr) {
      this.setCategoryConfig(categoryConfigStr);
    }
  }

  private calculateIngredients() {
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

    // Subtract pantry quantities from ingredients
    this.applyPantrySubtraction();
  }

  /**
   * Subtracts pantry item quantities from calculated ingredient quantities
   * and updates the resultingPantry to reflect consumed stock.
   */
  private applyPantrySubtraction() {
    if (!this.pantry) {
      this.resultingPantry = undefined;
      return;
    }

    // Deep clone the original pantry for the resulting pantry
    const clonedPantry = new Pantry();
    clonedPantry.items = deepClone(this.pantry.items);
    if (this.categoryConfig) {
      clonedPantry.setCategoryConfig(this.categoryConfig);
    }

    for (const ingredient of this.ingredients) {
      if (!ingredient.quantityTotal) continue;

      const pantryItem = clonedPantry.findItem(ingredient.name);
      if (!pantryItem || !pantryItem.quantity) continue;

      // Extract leaf quantities from the ingredient (handles simple, AND, OR)
      const leaves = this.extractLeafQuantities(ingredient.quantityTotal);

      let pantryExtended: QuantityWithExtendedUnit = {
        quantity: pantryItem.quantity,
        ...(pantryItem.unit && { unit: { name: pantryItem.unit } }),
      };

      for (const leaf of leaves) {
        const ingredientExtended = toExtendedUnit(leaf.quantity);

        try {
          // Subtract pantry from ingredient need (clamped to zero)
          const remaining = subtractQuantities(
            ingredientExtended,
            pantryExtended,
            { clampToZero: true },
          );

          // Apply the updated quantity back into the group structure
          leaf.apply(toPlainUnit(remaining) as QuantityWithPlainUnit);

          // Update the pantry remainder: subtract what was consumed
          const consumed = subtractQuantities(
            pantryExtended,
            ingredientExtended,
            { clampToZero: true },
          );
          pantryExtended = consumed;
        } catch {
          // Incompatible units — skip subtraction for this leaf
        }
      }

      pantryItem.quantity = pantryExtended.quantity;
      // v8 ignore else -- @preserve
      if (pantryExtended.unit) {
        pantryItem.unit = pantryExtended.unit.name;
      }
    }

    this.resultingPantry = clonedPantry;
  }

  /**
   * Extracts leaf (simple) quantities from a possibly nested group structure.
   * Each leaf includes the quantity and an `apply` callback to write back
   * a modified value into the original structure in-place.
   *
   * - Simple quantity → one leaf
   * - OR group → recurse into the first entry only (the primary alternative)
   * - AND group → recurse into all entries
   */
  private extractLeafQuantities(
    q: QuantityWithPlainUnit | MaybeNestedGroup<QuantityWithPlainUnit>,
  ): {
    quantity: QuantityWithPlainUnit;
    apply: (v: QuantityWithPlainUnit) => void;
  }[] {
    if (isQuantity(q)) {
      return [
        {
          quantity: q,
          apply: (v: QuantityWithPlainUnit) => {
            Object.assign(q, v);
          },
        },
      ];
    }

    if (isOrGroup(q)) {
      // Only subtract from the primary (first) entry
      const first = q.or[0];
      /* v8 ignore else -- @preserve */
      if (first) {
        return this.extractLeafQuantities(first);
      }
      /* v8 ignore next -- @preserve */
      return [];
    }

    // AND group: recurse into all entries
    const results: {
      quantity: QuantityWithPlainUnit;
      apply: (v: QuantityWithPlainUnit) => void;
    }[] = [];
    for (const entry of q.and) {
      results.push(...this.extractLeafQuantities(entry));
    }
    return results;
  }

  /**
   * Adds a recipe to the shopping list, then automatically
   * recalculates the quantities and recategorize the ingredients.
   * @param recipe - The recipe to add.
   * @param options - Options for adding the recipe.
   * @throws Error if the recipe has alternatives without corresponding choices.
   */
  addRecipe(recipe: Recipe, options: AddedRecipeOptions = {}): void {
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
    this.calculateIngredients();
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
   * recalculates the quantities and recategorize the ingredients.
   * @param index - The index of the recipe to remove.
   */
  removeRecipe(index: number) {
    if (index < 0 || index >= this.recipes.length) {
      throw new Error("Index out of bounds");
    }
    this.recipes.splice(index, 1);
    this.calculateIngredients();
    this.categorize();
  }

  /**
   * Adds a pantry to the shopping list. On-hand pantry quantities will be
   * subtracted from recipe ingredient needs on each recalculation.
   * @param pantry - A Pantry instance or a TOML string to parse.
   * @param options - Options for pantry parsing (only used when providing a TOML string).
   */
  addPantry(pantry: Pantry | string, options?: PantryOptions): void {
    if (typeof pantry === "string") {
      this.pantry = new Pantry(pantry, options);
    } else if (pantry instanceof Pantry) {
      this.pantry = pantry;
    } else {
      throw new Error(
        "Invalid pantry: expected a Pantry instance or TOML string",
      );
    }
    if (this.categoryConfig) {
      this.pantry.setCategoryConfig(this.categoryConfig);
    }
    this.calculateIngredients();
    this.categorize();
  }

  /**
   * Returns the resulting pantry with quantities updated to reflect
   * what was consumed by the shopping list's recipes.
   * Returns undefined if no pantry was added.
   * @returns The resulting Pantry, or undefined.
   */
  getPantry(): Pantry | undefined {
    return this.resultingPantry;
  }

  /**
   * Sets the category configuration for the shopping list
   * and automatically categorize current ingredients from the list.
   * Also propagates the configuration to the pantry if one is set.
   * @param config - The category configuration to parse.
   */
  setCategoryConfig(config: string | CategoryConfig) {
    if (typeof config === "string")
      this.categoryConfig = new CategoryConfig(config);
    else if (config instanceof CategoryConfig) this.categoryConfig = config;
    else throw new Error("Invalid category configuration");
    if (this.pantry) {
      this.pantry.setCategoryConfig(this.categoryConfig);
    }
    this.categorize();
  }

  /**
   * Categorizes the ingredients in the shopping list
   * Will use the category config if any, otherwise all ingredients will be placed in the "other" category
   */
  categorize() {
    if (!this.categoryConfig) {
      this.categories = { other: this.ingredients };
      return;
    }

    const categories: CategorizedIngredients = { other: [] };
    for (const category of this.categoryConfig.categories) {
      categories[category.name] = [];
    }

    for (const ingredient of this.ingredients) {
      let found = false;
      for (const category of this.categoryConfig.categories) {
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
