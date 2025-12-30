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
          ? quantityTotalExtended.quantities
          : [quantityTotalExtended]
      ) as (QuantityWithExtendedUnit | FlatOrGroup<QuantityWithExtendedUnit>)[];

      const candidates = this.ingredients.filter((i) => i.name === name);

      for (const [index, existing] of candidates.entries()) {
        if (!existing.quantityTotal) {
          if (index === candidates.length - 1) {
            existing.quantityTotal = quantityTotal;
            return;
          } else {
            continue;
          }
        }
        try {
          const existingQuantityTotalExtended = extendAllUnits(
            existing.quantityTotal,
          );
          const existingQuantities = (
            isAndGroup(existingQuantityTotalExtended)
              ? existingQuantityTotalExtended.quantities
              : [existingQuantityTotalExtended]
          ) as (
            | QuantityWithExtendedUnit
            | FlatOrGroup<QuantityWithExtendedUnit>
          )[];
          existing.quantityTotal = addEquivalentsAndSimplify(
            ...existingQuantities,
            ...newQuantities,
          );
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

      for (const ingredient of scaledRecipe.ingredients) {
        // Do not add hidden ingredients to the shopping list
        if (ingredient.flags && ingredient.flags.includes("hidden")) {
          continue;
        }

        if (ingredient.quantityTotal) {
          addIngredientQuantity(ingredient.name, ingredient.quantityTotal);
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
   * @param scaling - The scaling option for the recipe. Can be either a factor or a number of servings
   */
  add_recipe(
    recipe: Recipe,
    scaling?: { factor: number } | { servings: number },
  ): void;
  /**
   * Adds a recipe to the shopping list, then automatically
   * recalculates the quantities and recategorize the ingredients.
   * @param recipe - The recipe to add.
   * @param factor - The factor to scale the recipe by.
   * @deprecated since v2.0.3. Use the other call signature with `scaling` instead. Will be removed in v3
   */
  add_recipe(recipe: Recipe, factor?: number): void;
  add_recipe(
    recipe: Recipe,
    scaling?: { factor: number } | { servings: number } | number,
  ): void {
    if (typeof scaling === "number" || scaling === undefined) {
      this.recipes.push({ recipe, factor: scaling ?? 1 });
    } else {
      if ("factor" in scaling) {
        this.recipes.push({ recipe, factor: scaling.factor });
      } else {
        this.recipes.push({ recipe, servings: scaling.servings });
      }
    }
    this.calculate_ingredients();
    this.categorize();
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
