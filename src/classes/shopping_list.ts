import { CategoryConfig } from "./category_config";
import { Recipe } from "./recipe";
import type {
  Ingredient,
  CategorizedIngredients,
  AddedRecipe,
  AddedIngredient,
} from "../types";
import { addQuantities, type Quantity } from "../units";

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
  /**
   * The ingredients in the shopping list.
   */
  ingredients: Ingredient[] = [];
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
    for (const { recipe, factor } of this.recipes) {
      const scaledRecipe = factor === 1 ? recipe : recipe.scaleBy(factor);
      for (const ingredient of scaledRecipe.ingredients) {
        if (ingredient.hidden) {
          continue;
        }

        const existingIngredient = this.ingredients.find(
          (i) => i.name === ingredient.name,
        );

        let addSeparate = false;
        try {
          if (existingIngredient) {
            if (existingIngredient.quantity && ingredient.quantity) {
              const newQuantity: Quantity = addQuantities(
                {
                  value: existingIngredient.quantity,
                  unit: existingIngredient.unit ?? "",
                },
                {
                  value: ingredient.quantity,
                  unit: ingredient.unit ?? "",
                },
              );
              existingIngredient.quantity = newQuantity.value;
              if (newQuantity.unit) {
                existingIngredient.unit = newQuantity.unit;
              }
            } else if (ingredient.quantity) {
              existingIngredient.quantity = ingredient.quantity;
              if (ingredient.unit) {
                existingIngredient.unit = ingredient.unit;
              }
            }
          }
        } catch {
          // Cannot add quantities, adding as separate ingredients
          addSeparate = true;
        }

        if (!existingIngredient || addSeparate) {
          const newIngredient: AddedIngredient = { name: ingredient.name };
          if (ingredient.quantity) {
            newIngredient.quantity = ingredient.quantity;
          }
          if (ingredient.unit) {
            newIngredient.unit = ingredient.unit;
          }
          this.ingredients.push(newIngredient);
        }
      }
    }
  }

  /**
   * Adds a recipe to the shopping list, then automatically
   * recalculates the quantities and recategorize the ingredients.
   * @param recipe - The recipe to add.
   * @param factor - The factor to scale the recipe by.
   */
  add_recipe(recipe: Recipe, factor: number = 1) {
    this.recipes.push({ recipe, factor });
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
