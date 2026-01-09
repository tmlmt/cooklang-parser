import { describe, it, expect } from "vitest";
import { Recipe } from "../src/classes/recipe";
import {
  recipeWithComplexAlternatives,
  recipeWithGroupedAlternatives,
  recipeWithInlineAlternatives,
} from "./fixtures/recipes";
import { RecipeChoices } from "../src";

describe("Recipe.calc_ingredient_quantities", () => {
  it("should calculate ingredient quantities with default choices", () => {
    const recipe = new Recipe(recipeWithInlineAlternatives);
    // Add ingredients and choices to the recipe as needed for the test
    const computedIngredients = recipe.calc_ingredient_quantities();
    expect(computedIngredients.length).toBe(1);
    const milkIngredient = computedIngredients.find(
      (ing) => ing.name === "milk",
    );
    expect(milkIngredient).toBeDefined();
    expect(milkIngredient?.quantityTotal).toEqual({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 200 } },
      unit: "ml",
    });

    const recipe2 = new Recipe(recipeWithGroupedAlternatives);
    // Add ingredients and choices to the recipe as needed for the test
    const computedIngredients2 = recipe2.calc_ingredient_quantities();
    expect(computedIngredients2.length).toBe(1);
    const milkIngredient2 = computedIngredients2.find(
      (ing) => ing.name === "milk",
    );
    expect(milkIngredient2).toBeDefined();
    expect(milkIngredient2?.quantityTotal).toEqual({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 200 } },
      unit: "ml",
    });
  });

  it("should calculate ingredient quantities with specific choices", () => {
    const recipe = new Recipe(recipeWithInlineAlternatives);
    // For inline alternatives, the key is the ingredient item ID
    const choices: RecipeChoices = {
      ingredientItems: new Map([["ingredient-item-0", 1]]),
    };
    const computedIngredients = recipe.calc_ingredient_quantities(choices);
    expect(computedIngredients.length).toBe(1);
    const milkIngredient = computedIngredients.find(
      (ing) => ing.name === "almond milk",
    );
    expect(milkIngredient).toBeDefined();
    expect(milkIngredient?.quantityTotal).toEqual({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
      unit: "ml",
    });

    const recipe2 = new Recipe(recipeWithGroupedAlternatives);
    // For grouped alternatives, the key is the group name and goes in ingredientGroups
    const choices2: RecipeChoices = {
      ingredientGroups: new Map([["milk", 2]]),
    };
    const computedIngredients2 = recipe2.calc_ingredient_quantities(choices2);
    expect(computedIngredients2.length).toBe(1);
    const milkIngredient2 = computedIngredients2.find(
      (ing) => ing.name === "soy milk",
    );
    expect(milkIngredient2).toBeDefined();
    expect(milkIngredient2?.quantityTotal).toEqual({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 150 } },
      unit: "ml",
    });
  });

  it("correctly calculate ingredients quantities for complex alternatives", () => {
    const recipe = new Recipe(recipeWithComplexAlternatives);
    const choices: RecipeChoices = {
      ingredientGroups: new Map([["dough", 0]]),
    };
    const computedIngredients = recipe.calc_ingredient_quantities(choices);
    expect(computedIngredients.length).toBe(1);
    const doughIngredient = computedIngredients.find(
      (ing) => ing.name === "dough",
    );
    expect(doughIngredient).toBeDefined();
    expect(doughIngredient).toEqual({
      name: "dough",
      quantityTotal: {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
      },
      preparation: "defrosted",
      flags: ["recipe"],
      extras: { path: "dough.cook" },
    });
  });
});
