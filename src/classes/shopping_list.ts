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
   * The category configuration for the shopping list.
   * @see {@link CategoryConfig}
   */
  category_config?: CategoryConfig;
  /**
   * The categorized ingredients in the shopping list.
   * @see {@link CategorizedIngredients}
   */
  categories?: CategorizedIngredients;

  /**
   * Creates a new ShoppingList instance.
   * @param category_config_str - The category configuration to parse.
   */
  constructor(category_config_str?: string) {
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
   * Sets the category configuration for the shopping list.
   * @param config - The category configuration to parse.
   */
  set_category_config(config: string) {
    this.category_config = new CategoryConfig(config);
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
