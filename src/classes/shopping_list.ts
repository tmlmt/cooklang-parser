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
  EquivalenceRatioMap,
  RecipeChoices,
  ShoppingListRecipeRef,
} from "../types";
import {
  addEquivalentsAndSimplify,
  getEquivalentUnitsLists,
  buildEquivalenceRatioMap,
  recomputeEquivalents,
} from "../quantities/alternatives";
import {
  flattenPlainUnitGroup,
  subtractQuantities,
  toExtendedUnit,
  toPlainUnit,
} from "../quantities/mutations";
import { getAverageValue } from "../quantities/numeric";
import { deepClone } from "../utils/general";
import { NO_UNIT, normalizeUnit } from "../units/definitions";
import { areUnitsConvertible } from "../units/compatibility";
import { getToBase } from "../units/conversion";
import {
  leadingWhitespacesRegex,
  manualIngredientRegex,
  metadataRegex,
  recipeRefLineRegex,
} from "../regex";
import { parseQuantityWithUnit } from "../utils/parser_helpers";
import { formatQuantity } from "../utils/render_helpers";
import { NoTabAsIndentError, UnknownRecipePathError } from "../errors";

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
   * Free-hand ingredient lines not tied to any recipe.
   */
  manualItems: AddedIngredient[] = [];
  /**
   * Set of checked ingredient names (lowercased for case-insensitive matching).
   */
  checkedItems: Set<string> = new Set();
  /**
   * Map of unresolved recipe refs from {@link ShoppingList.loadFile | loadFile()},
   * keyed by path. Consumed by {@link ShoppingList.hydrateRecipe | hydrateRecipe()}.
   * @internal
   */
  private unresolvedRefs = new Map<
    string,
    { servings?: number; choices?: RecipeChoices }
  >();

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

    // Inject manual items into the raw quantities map
    for (const item of this.manualItems) {
      trackName(item.name);
      if (item.quantities) {
        const existing = rawQuantitiesMap.get(item.name) ?? [];
        // manual items always have single quantities
        for (const q of item.quantities as QuantityWithPlainUnit[]) {
          existing.push(toExtendedUnit(q));
        }
        // v8 ignore else -- @preserve
        if (existing.length > 0) {
          rawQuantitiesMap.set(item.name, existing);
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
        const ratioMap = buildEquivalenceRatioMap(
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

    // Track ingredient names that the pantry covers without quantity subtraction
    const pantryRemovedNames = new Set<string>();

    for (const ingredient of this.ingredients) {
      const pantryItem = clonedPantry.findItem(ingredient.name);

      // No-quantity ingredient (bare @salt):
      // - remove if pantry has a non-zero quantity for it
      // - remove if pantry has an unlimited entry (quantity: undefined)
      if (!ingredient.quantities || ingredient.quantities.length === 0) {
        if (pantryItem) {
          if (!pantryItem.quantity) {
            // Unlimited pantry entry (salt = {}) → remove bare ingredient
            pantryRemovedNames.add(ingredient.name);
          } else {
            const pantryValue = getAverageValue(pantryItem.quantity);
            if (typeof pantryValue === "number" && pantryValue > 0) {
              pantryRemovedNames.add(ingredient.name);
            }
          }
        }
        continue;
      }

      if (!pantryItem) continue;
      // Unlimited pantry entry (salt = {}) → remove quantified ingredient too
      if (!pantryItem.quantity) {
        pantryRemovedNames.add(ingredient.name);
        continue;
      }

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

          // When one side is unitless and the other has a unit,
          // addQuantities adopts the other's unit (Case 2), which is wrong
          // for pantry subtraction. Use equivalence ratios to convert instead.
          const leafHasUnit = leaf.unit !== undefined && leaf.unit !== "";
          const pantryHasUnit =
            pantryExtended.unit !== undefined &&
            pantryExtended.unit.name !== "";
          const ratioMap = this.equivalenceRatios.get(ingredient.name);
          const unitMismatch =
            leafHasUnit !== pantryHasUnit && ratioMap !== undefined;

          const leafDef = normalizeUnit(leaf.unit);
          const pantryDef = normalizeUnit(pantryExtended.unit?.name);

          if (unitMismatch) {
            const leafUnit = leaf.unit ?? NO_UNIT;
            const pantryUnit = pantryExtended.unit?.name ?? NO_UNIT;
            const ratioFromPantry =
              ratioMap[normalizeUnit(leafUnit)?.name ?? leafUnit]?.[
                normalizeUnit(pantryUnit)?.name ?? pantryUnit
              ];
            if (ratioFromPantry !== undefined) {
              const pantryValue = getAverageValue(pantryExtended.quantity);
              const leafValue = getAverageValue(ingredientExtended.quantity);
              // v8 ignore else -- @preserve: text quantities never reach the equivalence path
              if (
                typeof pantryValue === "number" &&
                typeof leafValue === "number"
              ) {
                const pantryInLeafUnits = pantryValue * ratioFromPantry;
                const subtracted = Math.min(pantryInLeafUnits, leafValue);
                const remainingLeafValue = Math.max(
                  leafValue - pantryInLeafUnits,
                  0,
                );

                // Write back the remaining value into the leaf
                leaf.quantity = {
                  type: "fixed",
                  value: { type: "decimal", decimal: remainingLeafValue },
                };

                // Update pantry remainder: convert consumed back to pantry units
                const consumedInPantryUnits = subtracted / ratioFromPantry;
                const remainingPantryValue = Math.max(
                  pantryValue - consumedInPantryUnits,
                  0,
                );
                pantryExtended = {
                  quantity: {
                    type: "fixed",
                    value: {
                      type: "decimal",
                      decimal: remainingPantryValue,
                    },
                  },
                  ...(pantryExtended.unit && { unit: pantryExtended.unit }),
                };
                continue;
              }
            }
            // Mismatch between units from pantry and leaf, but no equivalent ratio: we cannot subtract
            else {
              continue;
            }
          } else if (
            (leafDef && pantryDef && areUnitsConvertible(leafDef, pantryDef)) ||
            (leaf.unit ?? "").toLowerCase() ===
              (pantryExtended.unit?.name ?? "").toLowerCase()
          ) {
            // Direct subtraction — units are known and convertible
            const remaining = subtractQuantities(
              ingredientExtended,
              pantryExtended,
              { clampToZero: true },
            );
            const consumed = subtractQuantities(
              pantryExtended,
              ingredientExtended,
              { clampToZero: true },
            );
            pantryExtended = consumed;

            const updated = toPlainUnit(remaining) as QuantityWithPlainUnit;
            leaf.quantity = updated.quantity;
            leaf.unit = updated.unit;
          } else if (ratioMap) {
            // Indirect subtraction — leaf/pantry incompatible directly,
            // but an equivalent unit may bridge them via the ratioMap
            const canonicalLeaf = normalizeUnit(leaf.unit)?.name ?? leaf.unit!;
            const leafValue = getAverageValue(ingredientExtended.quantity);
            const pantryValue = getAverageValue(pantryExtended.quantity);

            if (
              typeof leafValue === "number" &&
              typeof pantryValue === "number" &&
              pantryDef
            ) {
              for (const [equivUnit, ratios] of Object.entries(ratioMap)) {
                const ratio = ratios[canonicalLeaf];
                if (ratio === undefined) continue;

                const equivDef = normalizeUnit(equivUnit);
                if (!equivDef || !areUnitsConvertible(equivDef, pantryDef))
                  continue;

                // Convert pantry to equivalent units via base
                const pantryInEquiv =
                  (pantryValue * getToBase(pantryDef)) / getToBase(equivDef);
                // How many leaf units the pantry covers
                const pantryInLeafUnits = pantryInEquiv / ratio;
                const subtracted = Math.min(pantryInLeafUnits, leafValue);
                const remainingLeafValue = Math.max(
                  leafValue - pantryInLeafUnits,
                  0,
                );

                leaf.quantity = {
                  type: "fixed",
                  value: { type: "decimal", decimal: remainingLeafValue },
                };

                // Update pantry remainder in original pantry units
                const consumedInEquiv = subtracted * ratio;
                const consumedInPantryUnits =
                  (consumedInEquiv * getToBase(equivDef)) /
                  getToBase(pantryDef);
                const remainingPantryValue = Math.max(
                  pantryValue - consumedInPantryUnits,
                  0,
                );
                pantryExtended = {
                  quantity: {
                    type: "fixed",
                    value: {
                      type: "decimal",
                      decimal: remainingPantryValue,
                    },
                  },
                  ...(pantryExtended.unit && { unit: pantryExtended.unit }),
                };
                break;
              }
            }
          }
          // else: truly incompatible units with no equivalence bridge — skip
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
          // v8 ignore else --@preserve: defensive type guard
          if (entry.equivalents && ratioMap) {
            const equivUnits = entry.equivalents.map((e) => e.unit!); // equivalents always have units
            entry.equivalents = recomputeEquivalents(
              entry.and,
              ratioMap,
              equivUnits,
            );
          }
          // Collapse single-leaf AND group to a plain IngredientQuantityGroup
          // v8 ignore else --@preserve: defensive type guard
          if (entry.and.length === 1) {
            const single = entry.and[0]!;
            ingredient.quantities[i] = {
              quantity: single.quantity,
              ...(single.unit && { unit: single.unit }),
              ...(entry.equivalents && { equivalents: entry.equivalents }),
            };
          }
        } else if ("equivalents" in entry && entry.equivalents) {
          // Recompute equivalents for plain entries with equivalents
          const ratioMap = this.equivalenceRatios.get(ingredient.name);
          // v8 ignore else --@preserve: defensive type guard
          if (ratioMap) {
            const equivUnits = entry.equivalents.map(
              (e: QuantityWithPlainUnit) => e.unit!, // equivalents always have units
            );
            const recomputed = recomputeEquivalents(
              [entry],
              ratioMap,
              equivUnits,
            );
            (entry as { equivalents?: QuantityWithPlainUnit[] }).equivalents =
              recomputed;
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

    // Remove ingredients that were fully covered by the pantry.
    // Pantry-cleared ingredients have `quantities` explicitly set to undefined
    // while ingredients that never had any quantity simply lack the key entirely
    // — those must stay unless the pantry covers them (pantryRemovedNames).
    this.ingredients = this.ingredients.filter(
      (ingr) =>
        !pantryRemovedNames.has(ingr.name) &&
        (!("quantities" in ingr) || ingr.quantities !== undefined),
    );

    this.resultingPantry = clonedPantry;
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
        path: options.path,
      });
    } else {
      if ("factor" in options.scaling) {
        this.recipes.push({
          recipe,
          factor: options.scaling.factor,
          choices: options.choices,
          path: options.path,
        });
      } else {
        this.recipes.push({
          recipe,
          servings: options.scaling.servings,
          choices: options.choices,
          path: options.path,
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
    const activeVariant = choices?.variant;
    const expectedAlternatives = recipe.getChoicesForVariant(activeVariant);
    const missingItems: string[] = [];
    const missingGroups: string[] = [];

    // Check for inline alternatives without choices
    for (const itemId of expectedAlternatives.ingredientItems.keys()) {
      if (!choices?.ingredientItems?.has(itemId)) {
        missingItems.push(itemId);
      }
    }

    // Check for grouped alternatives without choices
    for (const groupId of expectedAlternatives.ingredientGroups.keys()) {
      // v8 ignore else -- @preserve: detection if
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
   * Adds a free-hand ingredient item to the shopping list, then automatically
   * recalculates the quantities and recategorize the ingredients.
   * @param item - The ingredient item to add.
   */
  addManualItem(item: AddedIngredient): void {
    this.manualItems.push(item);
    this.calculateIngredients();
    this.categorize();
  }

  /**
   * Removes a free-hand ingredient item from the shopping list, then automatically
   * recalculates the quantities and recategorize the ingredients.
   * @param index - The index of the item to remove within {@link ShoppingList.manualItems}.
   */
  removeManualItem(index: number): void {
    if (index < 0 || index >= this.manualItems.length) {
      throw new Error("Index out of bounds");
    }
    this.manualItems.splice(index, 1);
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
          if (
            categoryIngredient.aliases
              .map((a) => a.toLowerCase())
              .includes(ingredient.name.toLowerCase())
          ) {
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

  /**
   * Parse a `.shopping-list` file content string and populate internal state.
   * Returns the unresolved recipe refs — the consuming app must load each
   * Recipe object and call {@link ShoppingList.hydrateRecipe | hydrateRecipe()} for each one.
   * @param content - The `.shopping-list` file content.
   * @returns Array of recipe references to resolve.
   */
  loadFile(content: string): ShoppingListRecipeRef[] {
    this.unresolvedRefs.clear();
    this.manualItems = [];

    let body = content;

    // Extract frontmatter using shared regex
    const fmMatch = body.match(metadataRegex);
    if (fmMatch) {
      const yamlBlock = fmMatch[2]!;
      body = body.slice(fmMatch[0].length);
      this.parseFrontmatter(yamlBlock);
    }

    const refs: ShoppingListRecipeRef[] = [];

    // Stack of path prefixes for nested recipe refs.
    // Each entry is { indent, prefix } where prefix includes trailing "/".
    const prefixStack: { indent: number; prefix: string }[] = [];

    // Pending ref line — resolved when the next ref line (or EOF) reveals
    // whether this line is a prefix-only node or an actual recipe ref.
    let pending: { trimmed: string; indent: number } | undefined;

    const resolvePending = (nextRefIndent: number | undefined) => {
      if (!pending) return;
      const { trimmed, indent } = pending;

      // Pop stack entries at or beyond this indent level
      while (
        prefixStack.length > 0 &&
        prefixStack[prefixStack.length - 1]!.indent >= indent
      ) {
        prefixStack.pop();
      }

      // Build full path by prepending the accumulated prefix
      const parentPrefix =
        prefixStack.length > 0
          ? prefixStack[prefixStack.length - 1]!.prefix
          : "";
      const fullLine = parentPrefix ? parentPrefix + trimmed.slice(2) : trimmed;

      const ref = this.parseRecipeRefLine(fullLine);

      // If the next ref line is deeper indented, this is a prefix-only node
      const isPrefix = nextRefIndent !== undefined && nextRefIndent > indent;

      if (!isPrefix) {
        refs.push(ref);
        const existing = this.unresolvedRefs.get(ref.path);
        this.unresolvedRefs.set(ref.path, {
          servings: ref.servings ?? existing?.servings,
          choices: existing?.choices,
        });
      }

      // Always push to prefix stack
      prefixStack.push({ indent, prefix: ref.path + "/" });

      pending = undefined;
    };

    for (const rawLine of body.split(/\r?\n/)) {
      const trimmed = rawLine.trim();
      if (trimmed === "" || trimmed.startsWith("--")) continue;

      if (trimmed.startsWith("./")) {
        // Detect indent level (spaces only — tabs rejected by convention)
        // Regex always matches
        const leadingMatch = rawLine.match(leadingWhitespacesRegex)!;
        const leading = leadingMatch[1]!;
        if (leading.includes("\t")) {
          throw new NoTabAsIndentError();
        }
        const indent = leading.length;

        resolvePending(indent);
        pending = { trimmed, indent };
      } else {
        this.manualItems.push(this.parseManualItemLine(trimmed));
      }
    }

    // Flush last pending as leaf
    resolvePending(undefined);

    return refs;
  }

  /**
   * After {@link ShoppingList.loadFile | loadFile()}, call this for each recipe ref once
   * the `.cook` file has been loaded and parsed into a Recipe object.
   * @param path - The recipe path as returned by `loadFile()`.
   * @param recipe - The parsed Recipe object.
   * @throws Error if the path was not found in the loaded refs.
   */
  hydrateRecipe(path: string, recipe: Recipe): void {
    const ref = this.unresolvedRefs.get(path);
    if (!ref) {
      throw new UnknownRecipePathError(path);
    }
    this.addRecipe(recipe, {
      path,
      scaling: ref.servings ? { servings: ref.servings } : undefined,
      choices: ref.choices,
    });
    this.unresolvedRefs.delete(path);
  }

  /**
   * Parse a `.shopping-checked` file content string and populate {@link ShoppingList.checkedItems | checkedItems}.
   * Replays the append-only log: last entry per ingredient wins.
   * @param content - The `.shopping-checked` file content.
   */
  loadCheckedFile(content: string): void {
    this.checkedItems.clear();
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (line === "" || line.startsWith("--")) continue;
      // v8 ignore else -- @preserve: invalid lines are ignored
      if (line.startsWith("+ ")) {
        this.checkedItems.add(line.slice(2).toLowerCase());
      } else if (line.startsWith("- ")) {
        this.checkedItems.delete(line.slice(2).toLowerCase());
      }
    }
  }

  /**
   * Serialize current state to `.shopping-list` file content string.
   * @returns The serialized file content.
   */
  serializeFile(): string {
    const lines: string[] = [];

    // Collect recipes with choices that have a path
    const recipesWithChoices = this.recipes.filter(
      (r) =>
        r.path &&
        r.choices &&
        (r.choices.variant ||
          (r.choices.ingredientItems && r.choices.ingredientItems.size > 0) ||
          (r.choices.ingredientGroups && r.choices.ingredientGroups.size > 0)),
    );

    // Emit frontmatter if choices exist
    if (recipesWithChoices.length > 0) {
      lines.push("---");
      lines.push("choices:");
      for (const addedRecipe of recipesWithChoices) {
        lines.push(`  "${addedRecipe.path}":`);
        const c = addedRecipe.choices!;
        if (c.variant) {
          lines.push(`    variant: ${c.variant}`);
        }
        if (c.ingredientItems && c.ingredientItems.size > 0) {
          lines.push(`    ingredientItems:`);
          for (const [k, v] of c.ingredientItems) {
            lines.push(`      ${k}: ${v}`);
          }
        }
        if (c.ingredientGroups && c.ingredientGroups.size > 0) {
          lines.push(`    ingredientGroups:`);
          for (const [k, v] of c.ingredientGroups) {
            lines.push(`      ${k}: ${v}`);
          }
        }
      }
      lines.push("---");
    }

    // Emit recipe refs (sorted and nested by common path prefixes)
    const recipeLines = this.serializeRecipeRefs();

    lines.push(...recipeLines);

    // Separator between recipes and manual items
    if (recipeLines.length > 0 && this.manualItems.length > 0) {
      lines.push("");
    }

    lines.push(...this.manualItems.map((i) => this.serializeManualItem(i)));
    lines.push(""); // trailing newline

    return lines.join("\n");
  }

  /**
   * Serialize {@link ShoppingList.checkedItems | checkedItems} to `.shopping-checked` file content string (compacted).
   * One `+ name` line per checked item, sorted alphabetically.
   * @returns The serialized file content.
   */
  serializeCheckedFile(): string {
    const sorted = [...this.checkedItems].sort();
    if (sorted.length === 0) return "";
    return sorted.map((name) => `+ ${name}`).join("\n") + "\n";
  }

  /**
   * Mark an ingredient as checked (case-insensitive).
   * @param ingredientName - The ingredient name.
   */
  check(ingredientName: string): void {
    this.checkedItems.add(ingredientName.toLowerCase());
  }

  /**
   * Mark an ingredient as unchecked (case-insensitive).
   * @param ingredientName - The ingredient name.
   */
  uncheck(ingredientName: string): void {
    this.checkedItems.delete(ingredientName.toLowerCase());
  }

  /**
   * Query whether an ingredient is checked (case-insensitive).
   * @param ingredientName - The ingredient name.
   * @returns True if the ingredient is checked.
   */
  isChecked(ingredientName: string): boolean {
    return this.checkedItems.has(ingredientName.toLowerCase());
  }

  /**
   * Clear all checked items.
   */
  uncheckAll(): void {
    this.checkedItems.clear();
  }

  /**
   * Generate a single line to append to a `.shopping-checked` file.
   * @param ingredientName - The ingredient name.
   * @param checked - Whether the ingredient is being checked or unchecked.
   * @returns A line like `"+ name\n"` or `"- name\n"`.
   */
  static checkedAppendLine(ingredientName: string, checked: boolean): string {
    return `${checked ? "+" : "-"} ${ingredientName}\n`;
  }

  /**
   * Compact a `.shopping-checked` file content string.
   * Replays the log and returns a clean file with only final `+` entries, sorted.
   * @param content - The raw `.shopping-checked` file content.
   * @returns The compacted file content.
   */
  static compactCheckedFile(content: string): string {
    const checked = new Set<string>();
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (line === "" || line.startsWith("--")) continue;
      // v8 ignore else -- @preserve: invalid lines are ignored
      if (line.startsWith("+ ")) {
        checked.add(line.slice(2).toLowerCase());
      } else if (line.startsWith("- ")) {
        checked.delete(line.slice(2).toLowerCase());
      }
    }
    const sorted = [...checked].sort();
    if (sorted.length === 0) return "";
    return sorted.map((name) => `+ ${name}`).join("\n") + "\n";
  }

  /**
   * Parse a recipe reference line like `./path{servings}`.
   * @internal
   */
  private parseRecipeRefLine(line: string): ShoppingListRecipeRef {
    // this function is always called for lines starting with "./" so regex always matches
    const match = line.match(recipeRefLineRegex)!;
    return {
      path: match[1]!,
      servings: match[2] ? Number(match[2]) : undefined,
    };
  }

  /**
   * Parse a manual ingredient line like `name{qty%unit}` or just `name`.
   * @internal
   */
  private parseManualItemLine(line: string): AddedIngredient {
    const match = line.match(manualIngredientRegex);
    const groups = match!.groups as { name: string; quantity?: string };
    const name = groups.name.trim();
    if (groups.quantity) {
      const parsed = parseQuantityWithUnit(groups.quantity);
      return {
        name,
        quantities: [
          {
            quantity: parsed.value,
            ...(parsed.unit && { unit: parsed.unit }),
          },
        ],
      };
    }
    return { name };
  }

  /**
   * Serialize a manual item back to file format.
   * @internal
   */
  private serializeManualItem(item: AddedIngredient): string {
    if (!item.quantities || item.quantities.length === 0) {
      return item.name;
    }
    const q = item.quantities[0]!;
    /* v8 ignore next -- @preserve: manual items never have AND groups */
    if ("and" in q) return item.name;
    const qtyStr = formatQuantity(q.quantity);
    return q.unit
      ? `${item.name}{${qtyStr}%${q.unit}}`
      : `${item.name}{${qtyStr}}`;
  }

  /**
   * Build nested recipe ref lines from `this.recipes`, sorted alphabetically
   * and grouped by common path prefixes.
   * @internal
   */
  private serializeRecipeRefs(): string[] {
    interface TrieNode {
      children: Map<string, TrieNode>;
      suffix?: string;
    }

    // Collect entries with servings suffix
    const entries: { path: string; suffix: string }[] = [];
    for (const addedRecipe of this.recipes) {
      if (!addedRecipe.path) continue;
      let suffix = "";
      if ("servings" in addedRecipe) {
        suffix = `{${addedRecipe.servings}}`;
      } else if (addedRecipe.factor !== 1) {
        const baseServings = addedRecipe.recipe.servings;
        /* v8 ignore else -- @preserve: recipe only scaled if base servings is defined */
        if (baseServings) {
          suffix = `{${baseServings * addedRecipe.factor}}`;
        }
      }
      entries.push({ path: addedRecipe.path, suffix });
    }

    if (entries.length === 0) return [];

    // Build trie — paths start with "./" so strip it for segment splitting
    const root: TrieNode = { children: new Map() };
    for (const entry of entries) {
      const segments = entry.path.slice(2).split("/");
      let node = root;
      for (const seg of segments) {
        if (!node.children.has(seg)) {
          node.children.set(seg, { children: new Map() });
        }
        node = node.children.get(seg)!;
      }
      node.suffix = entry.suffix;
    }

    // Emit lines with collapsing and nesting
    const lines: string[] = [];

    const emitChildren = (node: TrieNode, depth: number) => {
      const sorted = [...node.children.entries()].sort((a, b) =>
        a[0].localeCompare(b[0]),
      );
      for (const [segment, child] of sorted) {
        // Collapse single-child non-leaf chains
        let collapsedPath = segment;
        let current = child;
        while (current.children.size === 1 && current.suffix === undefined) {
          const [nextSeg, nextChild] = [...current.children.entries()][0]!;
          collapsedPath += "/" + nextSeg;
          current = nextChild;
        }

        const indent = "  ".repeat(depth);

        if (current.suffix !== undefined && current.children.size === 0) {
          // Pure leaf
          lines.push(`${indent}./${collapsedPath}${current.suffix}`);
        } else if (current.suffix !== undefined) {
          // Leaf with children — emit leaf, then children at same depth
          // to avoid data loss (prefix-only nodes are not recipe refs)
          lines.push(`${indent}./${collapsedPath}${current.suffix}`);
          emitDescendantsFlat(current, collapsedPath, depth);
        } else {
          // Non-leaf with children — emit as prefix line, nest children
          lines.push(`${indent}./${collapsedPath}`);
          emitChildren(current, depth + 1);
        }
      }
    };

    const emitDescendantsFlat = (
      node: TrieNode,
      pathPrefix: string,
      depth: number,
    ) => {
      const sorted = [...node.children.entries()].sort((a, b) =>
        a[0].localeCompare(b[0]),
      );
      const indent = "  ".repeat(depth);
      for (const [segment, child] of sorted) {
        const fullPath = `${pathPrefix}/${segment}`;
        lines.push(`${indent}./${fullPath}${child.suffix}`);
        emitDescendantsFlat(child, fullPath, depth);
      }
    };

    emitChildren(root, 0);

    return lines;
  }

  /**
   * Parse YAML frontmatter block and extract choices.
   * @internal
   */
  private parseFrontmatter(yaml: string): void {
    const lines = yaml.split(/\r?\n/);
    let i = 0;

    // Skip to "choices:" key
    while (i < lines.length) {
      if (lines[i]!.trim() === "choices:") {
        i++;
        break;
      }
      i++;
    }
    if (i >= lines.length) return;

    // Parse each recipe path entry under choices
    let currentPath: string | undefined;
    let currentChoices: RecipeChoices = {};
    let currentSubKey: string | undefined;
    let currentSubMap = new Map<string, number>();

    const flushSub = () => {
      if (currentSubKey && currentSubMap.size > 0) {
        // v8 ignore else -- @preserve: only these two subkeys are valid and should be flushed
        if (currentSubKey === "ingredientItems") {
          currentChoices.ingredientItems = new Map(currentSubMap);
        } else if (currentSubKey === "ingredientGroups") {
          currentChoices.ingredientGroups = new Map(currentSubMap);
        }
        currentSubKey = undefined;
        currentSubMap = new Map();
      }
    };

    const flushPath = () => {
      flushSub();
      if (
        currentPath &&
        (currentChoices.variant ||
          currentChoices.ingredientItems ||
          currentChoices.ingredientGroups)
      ) {
        this.unresolvedRefs.set(currentPath, {
          choices: currentChoices,
        });
      }
    };

    while (i < lines.length) {
      const line = lines[i]!;
      const leadingWhitespace = line.match(leadingWhitespacesRegex)?.[1];
      if (leadingWhitespace && leadingWhitespace.includes("\t")) {
        throw new NoTabAsIndentError();
      }
      const indent = leadingWhitespace!.length;
      const trimmed = line.trim();

      if (trimmed === "" || trimmed.startsWith("--")) {
        i++;
        continue;
      }

      // v8 ignore else -- @preserve: only specific keys and structure are supported in frontmatter
      if (indent === 2 && trimmed.endsWith(":")) {
        // New recipe path entry
        flushPath();
        // Remove surrounding quotes and trailing colon
        currentPath = trimmed.slice(0, -1).replace(/^["']|["']$/g, "");
        currentChoices = {};
        currentSubKey = undefined;
        currentSubMap = new Map();
      } else if (indent === 4 && trimmed.includes(":")) {
        // Key within recipe path
        flushSub();
        const colonIdx = trimmed.indexOf(":");
        const key = trimmed.slice(0, colonIdx).trim();
        const value = trimmed.slice(colonIdx + 1).trim();
        if (value) {
          // v8 ignore else -- @preserve: only this key should be handled
          if (key === "variant") {
            currentChoices.variant = value;
          }
        } else {
          // Sub-object follows
          currentSubKey = key;
          currentSubMap = new Map();
        }
      } else if (indent === 6 && trimmed.includes(":")) {
        // Key within sub-object
        const colonIdx = trimmed.indexOf(":");
        const key = trimmed.slice(0, colonIdx).trim();
        const value = trimmed.slice(colonIdx + 1).trim();
        currentSubMap.set(key, Number(value));
      }

      i++;
    }

    flushPath();
  }
}
