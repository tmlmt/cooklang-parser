import { AisleConfig } from "./aisle_config";
import { Recipe } from "./recipe";
import type {
  Ingredient,
  CategorizedIngredients,
  AddedRecipe,
  AddedIngredient,
} from "../types";
import { addQuantities } from "../units";

/**
 * Represents a shopping list.
 * @category Classes
 */
export class ShoppingList {
  /**
   * The ingredients in the shopping list.
   * @see {@link Ingredient}
   */
  ingredients: Ingredient[] = [];
  /**
   * The recipes in the shopping list.
   * @see {@link AddedRecipe}
   */
  recipes: AddedRecipe[] = [];
  /**
   * The aisle configuration for the shopping list.
   * @see {@link AisleConfig}
   */
  aisle_config?: AisleConfig;
  /**
   * The categorized ingredients in the shopping list.
   * @see {@link CategorizedIngredients}
   */
  categories?: CategorizedIngredients;

  /**
   * Creates a new ShoppingList instance.
   * @param aisle_config_str - The aisle configuration to parse.
   */
  constructor(aisle_config_str?: string) {
    if (aisle_config_str) {
      this.set_aisle_config(aisle_config_str);
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
              const newQuantity = addQuantities(
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
   * Adds a recipe to the shopping list.
   * @param recipe - The recipe to add.
   * @param factor - The factor to scale the recipe by.
   */
  add_recipe(recipe: Recipe, factor: number = 1) {
    this.recipes.push({ recipe, factor });
    this.calculate_ingredients();
    this.categorize();
  }

  /**
   * Removes a recipe from the shopping list.
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
   * Sets the aisle configuration for the shopping list.
   * @param config - The aisle configuration to parse.
   */
  set_aisle_config(config: string) {
    this.aisle_config = new AisleConfig(config);
    this.categorize();
  }

  /**
   * Categorizes the ingredients in the shopping list
   * Will use the aisle config if any, otherwise all ingredients will be placed in the "other" category
   */
  categorize() {
    if (!this.aisle_config) {
      this.categories = { other: this.ingredients };
      return;
    }

    const categories: CategorizedIngredients = { other: [] };
    for (const category of this.aisle_config.categories) {
      categories[category.name] = [];
    }

    for (const ingredient of this.ingredients) {
      let found = false;
      for (const category of this.aisle_config.categories) {
        for (const aisleIngredient of category.ingredients) {
          if (aisleIngredient.aliases.includes(ingredient.name)) {
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
