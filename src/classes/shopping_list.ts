import { CategoryConfig } from "./category_config";
import { Pantry } from "./pantry";
import { Recipe } from "./recipe";
import type {
  CategorizedIngredients,
  AddedRecipe,
  AddedIngredient,
  QuantityWithExtendedUnit,
  QuantityWithPlainUnit,
  FlatOrGroup,
  AddedRecipeOptions,
  PantryOptions,
  SpecificUnitSystem,
} from "../types";
import {
  addEquivalentsAndSimplify,
  getEquivalentUnitsLists,
} from "../quantities/alternatives";
import {
  flattenPlainUnitGroup,
  subtractQuantities,
  toExtendedUnit,
  toPlainUnit,
} from "../quantities/mutations";
import { getAverageValue } from "../quantities/numeric";
import { deepClone } from "../utils/general";
import type { QuantityWithUnitDef } from "../types";

/**
 * Maps equivalent unit name → (primary unit name → ratio).
 * ratio = equiv_quantity_value / primary_quantity_value from the original OR group.
 * Used to recompute equivalents after pantry subtraction modifies primaries.
 */
type EquivalenceRatioMap = Record<string, Record<string, number>>;

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
   * The unit system to use for quantity simplification.
   * When set, overrides per-recipe unit systems.
   */
  unitSystem?: SpecificUnitSystem;
  /**
   * Per-ingredient equivalence ratio maps for recomputing equivalents
   * after pantry subtraction. Keyed by ingredient name.
   * @internal
   */
  private equivalenceRatios = new Map<string, EquivalenceRatioMap>();
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

    // Accumulate raw quantities per ingredient name across all recipes
    const rawQuantitiesMap = new Map<
      string,
      (QuantityWithExtendedUnit | FlatOrGroup<QuantityWithExtendedUnit>)[]
    >();
    // Track first-appearance order of ingredient names
    const nameOrder: string[] = [];
    const trackName = (name: string) => {
      if (!nameOrder.includes(name)) {
        nameOrder.push(name);
      }
    };

    for (const addedRecipe of this.recipes) {
      let scaledRecipe: Recipe;
      if ("factor" in addedRecipe) {
        const { recipe, factor } = addedRecipe;
        scaledRecipe = factor === 1 ? recipe : recipe.scaleBy(factor);
      } else {
        scaledRecipe = addedRecipe.recipe.scaleTo(addedRecipe.servings);
      }

      const rawGroups = scaledRecipe.getRawQuantityGroups({
        choices: addedRecipe.choices,
      });

      for (const group of rawGroups) {
        if (group.flags?.includes("hidden") || !group.usedAsPrimary) {
          continue;
        }

        trackName(group.name);

        if (group.quantities.length > 0) {
          const existing = rawQuantitiesMap.get(group.name) ?? [];
          existing.push(...group.quantities);
          rawQuantitiesMap.set(group.name, existing);
        }
      }
    }

    // Process each ingredient: addEquivalentsAndSimplify → flattenPlainUnitGroup
    this.equivalenceRatios.clear();
    for (const name of nameOrder) {
      const rawQuantities = rawQuantitiesMap.get(name);

      if (!rawQuantities || rawQuantities.length === 0) {
        this.ingredients.push({ name });
        continue;
      }

      // Separate text-value quantities (cannot be summed) from numeric ones
      const textEntries: QuantityWithExtendedUnit[] = [];
      const numericEntries: (
        | QuantityWithExtendedUnit
        | FlatOrGroup<QuantityWithExtendedUnit>
      )[] = [];
      for (const q of rawQuantities) {
        if (
          "quantity" in q &&
          q.quantity.type === "fixed" &&
          q.quantity.value.type === "text"
        ) {
          textEntries.push(q);
        } else {
          numericEntries.push(q);
        }
      }

      // Build equivalence ratio map for recomputing equivalents after pantry subtraction
      if (numericEntries.length > 1) {
        const ratioMap = ShoppingList.buildEquivalenceRatioMap(
          getEquivalentUnitsLists(...numericEntries),
        );
        if (Object.keys(ratioMap).length > 0) {
          this.equivalenceRatios.set(name, ratioMap);
        }
      }

      const resultQuantities: (
        | QuantityWithPlainUnit
        | {
            and: QuantityWithPlainUnit[];
            equivalents?: QuantityWithPlainUnit[];
          }
      )[] = [];

      // Text values stay as individual entries (placed first to preserve order)
      for (const t of textEntries) {
        resultQuantities.push(toPlainUnit(t) as QuantityWithPlainUnit);
      }

      if (numericEntries.length > 0) {
        resultQuantities.push(
          ...flattenPlainUnitGroup(
            addEquivalentsAndSimplify(numericEntries, this.unitSystem),
          ),
        );
      }

      this.ingredients.push({
        name,
        quantities: resultQuantities,
      });
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
      if (!ingredient.quantities || ingredient.quantities.length === 0)
        continue;

      const pantryItem = clonedPantry.findItem(ingredient.name);
      if (!pantryItem || !pantryItem.quantity) continue;

      let pantryExtended: QuantityWithExtendedUnit = {
        quantity: pantryItem.quantity,
        ...(pantryItem.unit && { unit: { name: pantryItem.unit } }),
      };

      for (let i = 0; i < ingredient.quantities.length; i++) {
        const entry = ingredient.quantities[i]!;
        // For AND groups, iterate each .and entry individually
        const leaves: QuantityWithPlainUnit[] =
          "and" in entry ? entry.and : [entry];

        for (const leaf of leaves) {
          const ingredientExtended = toExtendedUnit(leaf);

          try {
            const remaining = subtractQuantities(
              ingredientExtended,
              pantryExtended,
              { clampToZero: true },
            );

            // Write back into the leaf in-place
            const updated = toPlainUnit(remaining) as QuantityWithPlainUnit;
            leaf.quantity = updated.quantity;
            leaf.unit = updated.unit;

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

        // Remove zero-valued leaves from AND groups
        if ("and" in entry) {
          const nonZero = entry.and.filter(
            (leaf) =>
              leaf.quantity.type !== "fixed" ||
              leaf.quantity.value.type !== "decimal" ||
              leaf.quantity.value.decimal !== 0,
          );
          entry.and.length = 0;
          entry.and.push(...nonZero);
          // Recompute equivalents from updated primaries using stored ratios
          const ratioMap = this.equivalenceRatios.get(ingredient.name);
          if (entry.equivalents && ratioMap) {
            const equivUnits = entry.equivalents.map((e) => e.unit ?? "");
            entry.equivalents = ShoppingList.recomputeEquivalents(
              entry.and,
              ratioMap,
              equivUnits,
            );
          }
          // Collapse single-leaf AND group to a plain IngredientQuantityGroup
          if (entry.and.length === 1) {
            const single = entry.and[0]!;
            ingredient.quantities[i] = {
              quantity: single.quantity,
              ...(single.unit && { unit: single.unit }),
              ...(entry.equivalents && { equivalents: entry.equivalents }),
              ...(entry.alternatives && { alternatives: entry.alternatives }),
            };
          }
        }
      }

      // Remove empty AND groups (all leaves were zero)
      // and remove zero-valued simple entries
      ingredient.quantities = ingredient.quantities.filter((entry) => {
        if ("and" in entry) return entry.and.length > 0;
        return !(
          entry.quantity.type === "fixed" &&
          entry.quantity.value.type === "decimal" &&
          entry.quantity.value.decimal === 0
        );
      });

      // Remove ingredient entirely if all quantities were zeroed out
      if (ingredient.quantities.length === 0) {
        ingredient.quantities = undefined;
      }

      pantryItem.quantity = pantryExtended.quantity;
      /* v8 ignore else -- @preserve */
      if (pantryExtended.unit) {
        pantryItem.unit = pantryExtended.unit.name;
      }
    }

    this.resultingPantry = clonedPantry;
  }

  /**
   * Builds a ratio map from equivalence lists.
   * For each equivalence list, stores ratio = equiv_value / primary_value
   * for every pair of units, so equivalents can be recomputed after
   * pantry subtraction modifies primary quantities.
   */
  private static buildEquivalenceRatioMap(
    unitsLists: QuantityWithUnitDef[][],
  ): EquivalenceRatioMap {
    const ratioMap: EquivalenceRatioMap = {};
    for (const list of unitsLists) {
      for (const equiv of list) {
        const equivValue = getAverageValue(equiv.quantity);
        if (typeof equivValue === "string") continue;
        for (const primary of list) {
          if (primary === equiv) continue;
          const primaryValue = getAverageValue(primary.quantity);
          if (typeof primaryValue === "string" || primaryValue === 0) continue;
          const equivUnit = equiv.unit.name;
          const primaryUnit = primary.unit.name;
          ratioMap[equivUnit] ??= {};
          ratioMap[equivUnit][primaryUnit] = equivValue / primaryValue;
        }
      }
    }
    return ratioMap;
  }

  /**
   * Recomputes equivalent quantities from current primary values and stored ratios.
   * For each equivalent unit in equivUnits, new_value = Σ (primary_value × ratio[equivUnit][primaryUnit]).
   * Returns undefined if all equivalents compute to zero.
   */
  private static recomputeEquivalents(
    primaries: QuantityWithPlainUnit[],
    ratioMap: EquivalenceRatioMap,
    equivUnits: string[],
  ): QuantityWithPlainUnit[] | undefined {
    const equivalents: QuantityWithPlainUnit[] = [];

    for (const equivUnit of equivUnits) {
      const ratios = ratioMap[equivUnit];
      if (!ratios) continue;

      let total = 0;
      for (const primary of primaries) {
        const pUnit = primary.unit ?? "";
        const ratio = ratios[pUnit];
        if (ratio === undefined) continue;
        const pValue = getAverageValue(primary.quantity);
        if (typeof pValue === "string") continue;
        total += pValue * ratio;
      }

      if (total > 0) {
        equivalents.push({
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: total },
          },
          ...(equivUnit !== "" && { unit: equivUnit }),
        });
      }
    }

    return equivalents.length > 0 ? equivalents : undefined;
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
