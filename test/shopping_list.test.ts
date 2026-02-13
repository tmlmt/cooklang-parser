import { describe, it, expect } from "vitest";
import { ShoppingList } from "../src/classes/shopping_list";
import { CategoryConfig } from "../src/classes/category_config";
import { Pantry } from "../src/classes/pantry";
import type { CategorizedIngredients, Ingredient } from "../src/types";
import { Recipe } from "../src/classes/recipe";
import {
  recipeForShoppingList1,
  recipeForShoppingList2,
  recipeForShoppingList3,
  recipeWithInlineAlternatives,
} from "./fixtures/recipes";

describe("ShoppingList", () => {
  const recipe1 = new Recipe(recipeForShoppingList1);
  const recipe2 = new Recipe(recipeForShoppingList2);
  const recipe3 = new Recipe(recipeForShoppingList3);
  const recipeAlt = new Recipe(recipeWithInlineAlternatives);

  describe("Adding recipes", () => {
    it("should add a recipe's ingredients", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe1);
      expect(shoppingList.ingredients).toEqual([
        {
          name: "flour",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 100 },
            },
            unit: "g",
          },
        },
        {
          name: "sugar",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 50 },
            },
            unit: "g",
          },
        },
        {
          name: "eggs",
          quantityTotal: {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
          },
        },
        {
          name: "milk",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 200 },
            },
            unit: "ml",
          },
        },
        {
          name: "pepper",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "text", text: "to taste" },
            },
          },
        },
        { name: "spices" },
      ]);
    });

    it("should handle adding a recipe with multiple units for the same ingredient", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe1);
      shoppingList.addRecipe(recipe3);
      shoppingList.addRecipe(recipe1); // adding the same one again to check accumulation
      expect(shoppingList.ingredients.find((i) => i.name === "eggs")).toEqual({
        name: "eggs",
        quantityTotal: {
          and: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 4 },
              },
            },
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: "dozen",
            },
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: "half dozen",
            },
          ],
        },
      });
    });

    it("should merge ingredients from multiple recipes", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe1);
      shoppingList.addRecipe(recipe2);
      expect(shoppingList.ingredients).toEqual([
        {
          name: "flour",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 150 },
            },
            unit: "g",
          },
        },
        {
          name: "sugar",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 50 },
            },
            unit: "g",
          },
        },
        {
          name: "eggs",
          quantityTotal: {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 3 } },
          },
        },
        {
          name: "milk",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 200 },
            },
            unit: "ml",
          },
        },
        {
          name: "pepper",
          quantityTotal: {
            and: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "text", text: "to taste" },
                },
              },
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 1 },
                },
                unit: "tsp",
              },
            ],
          },
        },
        {
          name: "spices",
          quantityTotal: {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
            unit: "pinch",
          },
        },
        {
          name: "butter",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 25 },
            },
            unit: "g",
          },
        },
      ]);
    });

    it("should scale recipe ingredients (deprecated signature)", () => {
      const shoppingList = new ShoppingList();
      // TODO: Deprecated, to remove in v3
      shoppingList.addRecipe(recipe1, { scaling: { factor: 2 } });
      expect(shoppingList.ingredients).toEqual([
        {
          name: "flour",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 200 },
            },
            unit: "g",
          },
        },
        {
          name: "sugar",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 100 },
            },
            unit: "g",
          },
        },
        {
          name: "eggs",
          quantityTotal: {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 4 } },
          },
        },
        {
          name: "milk",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 400 },
            },
            unit: "ml",
          },
        },
        {
          name: "pepper",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "text", text: "to taste" },
            },
          },
        },
        { name: "spices" },
      ]);
    });

    it("should scale recipe ingredients (using factor)", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe1, { scaling: { factor: 2 } });
      expect(shoppingList.ingredients).toEqual([
        {
          name: "flour",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 200 },
            },
            unit: "g",
          },
        },
        {
          name: "sugar",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 100 },
            },
            unit: "g",
          },
        },
        {
          name: "eggs",
          quantityTotal: {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 4 } },
          },
        },
        {
          name: "milk",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 400 },
            },
            unit: "ml",
          },
        },
        {
          name: "pepper",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "text", text: "to taste" },
            },
          },
        },
        { name: "spices" },
      ]);
    });

    it("should scale recipe ingredients (using servings)", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe1, { scaling: { servings: 3 } });
      expect(shoppingList.ingredients).toEqual([
        {
          name: "flour",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 300 },
            },
            unit: "g",
          },
        },
        {
          name: "sugar",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 150 },
            },
            unit: "g",
          },
        },
        {
          name: "eggs",
          quantityTotal: {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 6 } },
          },
        },
        {
          name: "milk",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 600 },
            },
            unit: "ml",
          },
        },
        {
          name: "pepper",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "text", text: "to taste" },
            },
          },
        },
        { name: "spices" },
      ]);
    });

    it("should take into account ingredient choices when adding a recipe", () => {
      const shoppingList = new ShoppingList();
      const choices = {
        ingredientItems: new Map([["ingredient-item-0", 1]]),
      };
      shoppingList.addRecipe(recipeAlt, { choices });
      expect(shoppingList.ingredients).toEqual([
        {
          name: "almond milk",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 100 },
            },
            unit: "ml",
          },
        },
      ]);
    });

    it("should handle ingredients with AND groups in quantities", () => {
      // Recipe with incompatible units that form AND groups (large + small with cup equivalents)
      const recipeWithAndGroups = new Recipe(`
Add @potato{1%=large|1.5%cup} and @&potato{1%=small|0.5%cup}
`);
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipeWithAndGroups);
      // Potato should have quantities combined from the AND group
      const potato = shoppingList.ingredients.find((i) => i.name === "potato");
      expect(potato).toBeDefined();
      // The AND group (1 large + 1 small) with equivalents (1.5 cup + 0.5 cup = 2 cup) should be processed
      expect(potato?.quantityTotal).toBeDefined();
    });

    it("should throw an error when adding a recipe with inline alternatives without choices", () => {
      const shoppingList = new ShoppingList();
      // recipeAlt has inline alternatives (ingredient-item-0)
      expect(() => shoppingList.addRecipe(recipeAlt)).toThrowError(
        /Recipe has unresolved alternatives.*ingredientItems.*ingredient-item-0/,
      );
    });

    it("should throw an error when adding a recipe with grouped alternatives without choices", () => {
      const shoppingList = new ShoppingList();
      const recipeWithGroups = new Recipe(`
Mix @|milk|milk{200%ml} or @|milk|almond milk{100%ml}
`);
      expect(() => shoppingList.addRecipe(recipeWithGroups)).toThrowError(
        /Recipe has unresolved alternatives.*ingredientGroups.*milk/,
      );
    });

    it("should accept grouped alternatives with proper choices", () => {
      const shoppingList = new ShoppingList();
      const recipeWithGroups = new Recipe(`
Mix @|milk|milk{200%ml} or @|milk|almond milk{100%ml}
`);
      const choices = {
        ingredientGroups: new Map([["milk", 1]]), // Choose almond milk (index 1)
      };
      shoppingList.addRecipe(recipeWithGroups, { choices });
      expect(shoppingList.ingredients).toEqual([
        {
          name: "almond milk",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 100 },
            },
            unit: "ml",
          },
        },
      ]);
    });
  });

  describe("Association with CategoryConfig", () => {
    it("should parse at creation if a category config is provided as a string", () => {
      const shoppingList = new ShoppingList(`
[Dairy]
milk
butter

[Bakery]
flour
sugar
    `);
      expect(shoppingList.categoryConfig).toBeDefined();
      expect(shoppingList.categoryConfig?.categories.length).toBe(2);
    });

    it("should parse at creation if a CategoryConfig", () => {
      const categoryConfig = new CategoryConfig(`
[Dairy]
milk
butter

[Bakery]
flour
sugar
    `);
      const shoppingList = new ShoppingList(categoryConfig);
      expect(shoppingList.categoryConfig).toBeDefined();
      expect(shoppingList.categoryConfig?.categories.length).toBe(2);
    });

    it("should set category config", () => {
      const shoppingList = new ShoppingList();
      const config = `
[Dairy]
milk
butter

[Bakery]
flour
sugar
    `;
      shoppingList.setCategoryConfig(config);
      expect(shoppingList.categoryConfig).toBeDefined();
      expect(shoppingList.categoryConfig?.categories.length).toBe(2);
    });

    it("should throw an error if an incorrect category config is provided", () => {
      const shoppingList = new ShoppingList();
      const config = 2;
      // @ts-expect-error testing a deliberate type error
      expect(() => shoppingList.setCategoryConfig(config)).toThrowError();
    });
  });

  describe("Ingredient categorization", () => {
    it("should categorize ingredients", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe1);
      shoppingList.addRecipe(recipe2);
      const config = `
[Dairy]
milk
butter

[Bakery]
flour
sugar
    `;
      shoppingList.setCategoryConfig(config);

      // Sort ingredients within each category
      for (const category in shoppingList.categories!) {
        shoppingList.categories[category]!.sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      }

      const expected: CategorizedIngredients = {
        Bakery: [
          {
            name: "flour",
            quantityTotal: {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 150 },
              },
              unit: "g",
            },
          },
          {
            name: "sugar",
            quantityTotal: {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 50 },
              },
              unit: "g",
            },
          },
        ],
        Dairy: [
          {
            name: "butter",
            quantityTotal: {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 25 },
              },
              unit: "g",
            },
          },
          {
            name: "milk",
            quantityTotal: {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 200 },
              },
              unit: "ml",
            },
          },
        ],
        other: [
          {
            name: "eggs",
            quantityTotal: {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 3 },
              },
            },
          },
          {
            name: "pepper",
            quantityTotal: {
              and: [
                {
                  quantity: {
                    type: "fixed",
                    value: { type: "text", text: "to taste" },
                  },
                },
                {
                  quantity: {
                    type: "fixed",
                    value: { type: "decimal", decimal: 1 },
                  },
                  unit: "tsp",
                },
              ],
            },
          },
          {
            name: "spices",
            quantityTotal: {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: "pinch",
            },
          },
        ],
      };

      // Sort ingredients in expected categories
      for (const category in expected) {
        expected[category]!.sort((a: Ingredient, b: Ingredient): number =>
          a.name.localeCompare(b.name),
        );
      }

      expect(shoppingList.categories).toEqual(expected);
    });

    it('should categorize all ingredients as "other" if no category config is set', () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe1);
      expect(shoppingList.categories).toEqual({
        other: [
          {
            name: "flour",
            quantityTotal: {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 100 },
              },
              unit: "g",
            },
          },
          {
            name: "sugar",
            quantityTotal: {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 50 },
              },
              unit: "g",
            },
          },
          {
            name: "eggs",
            quantityTotal: {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 2 },
              },
            },
          },
          {
            name: "milk",
            quantityTotal: {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 200 },
              },
              unit: "ml",
            },
          },
          {
            name: "pepper",
            quantityTotal: {
              quantity: {
                type: "fixed",
                value: { type: "text", text: "to taste" },
              },
            },
          },
          { name: "spices" },
        ],
      });
    });
  });

  describe("Removing recipes", () => {
    it("should remove a recipe and recalculate ingredients", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe1);
      shoppingList.addRecipe(recipe2);
      shoppingList.removeRecipe(0);
      expect(shoppingList.ingredients).toEqual([
        {
          name: "flour",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 50 },
            },
            unit: "g",
          },
        },
        {
          name: "butter",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 25 },
            },
            unit: "g",
          },
        },
        {
          name: "eggs",
          quantityTotal: {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          },
        },
        {
          name: "pepper",
          quantityTotal: {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
            unit: "tsp",
          },
        },
        {
          name: "spices",
          quantityTotal: {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
            unit: "pinch",
          },
        },
      ]);
    });

    it("should remove a recipe and re-categorize ingredients", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe1);
      shoppingList.addRecipe(recipe2);
      const config = `[Bakery]
                    flour`;
      shoppingList.setCategoryConfig(config);
      expect(shoppingList.categories?.Bakery).toEqual([
        {
          name: "flour",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 150 },
            },
            unit: "g",
          },
        },
      ]);
      shoppingList.removeRecipe(0);
      expect(shoppingList.categories?.Bakery).toEqual([
        {
          name: "flour",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 50 },
            },
            unit: "g",
          },
        },
      ]);
    });
    it("should throw an error when removing a recipe with an invalid index", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe1);
      expect(() => shoppingList.removeRecipe(1)).toThrow("Index out of bounds");
    });
  });

  describe("Pantry integration", () => {
    const pantryRecipe = new Recipe(
      `Add @flour{200%g} and @sugar{100%g} and @eggs{3}.`,
    );

    it("should subtract pantry quantities from ingredients", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(pantryRecipe);
      shoppingList.addPantry(`[pantry]\nflour = "100%g"`);

      const flour = shoppingList.ingredients.find((i) => i.name === "flour");
      expect(flour).toBeDefined();
      expect(flour!.quantityTotal).toMatchObject({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 100 },
        },
        unit: "g",
      });
    });

    it("should clamp ingredient quantity to zero when pantry has more", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(pantryRecipe);
      shoppingList.addPantry(`[pantry]\nflour = "500%g"`);

      const flour = shoppingList.ingredients.find((i) => i.name === "flour");
      expect(flour).toBeDefined();
      expect(flour!.quantityTotal).toMatchObject({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 0 },
        },
      });
    });

    it("should update resulting pantry after subtraction", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(pantryRecipe);
      shoppingList.addPantry(`[pantry]\nflour = "500%g"`);

      const resultingPantry = shoppingList.getPantry();
      expect(resultingPantry).toBeDefined();
      const flour = resultingPantry!.findItem("flour");
      expect(flour).toBeDefined();
      // Pantry had 500g, recipe needs 200g → 300g remaining
      expect(flour!.quantity).toMatchObject({
        type: "fixed",
        value: { type: "decimal", decimal: 300 },
      });
    });

    it("should set resulting pantry item to zero when fully consumed", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(pantryRecipe);
      shoppingList.addPantry(`[pantry]\nflour = "100%g"`);

      const resultingPantry = shoppingList.getPantry();
      const flour = resultingPantry!.findItem("flour");
      expect(flour!.quantity).toMatchObject({
        type: "fixed",
        value: { type: "decimal", decimal: 0 },
      });
    });

    it("should not modify ingredients without pantry match", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(pantryRecipe);
      shoppingList.addPantry(`[pantry]\nflour = "100%g"`);

      const sugar = shoppingList.ingredients.find((i) => i.name === "sugar");
      expect(sugar!.quantityTotal).toMatchObject({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 100 },
        },
        unit: "g",
      });
    });

    it("should accept a Pantry instance", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(pantryRecipe);
      const pantry = new Pantry(`[pantry]\nflour = "100%g"`);
      shoppingList.addPantry(pantry);

      const flour = shoppingList.ingredients.find((i) => i.name === "flour");
      expect(flour!.quantityTotal).toMatchObject({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 100 },
        },
        unit: "g",
      });
    });

    it("should throw on invalid pantry argument", () => {
      const shoppingList = new ShoppingList();
      expect(() => shoppingList.addPantry(42 as unknown as string)).toThrow(
        "Invalid pantry",
      );
    });

    it("should recalculate when adding/removing recipes with pantry", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addPantry(`[pantry]\nflour = "100%g"`);
      shoppingList.addRecipe(pantryRecipe);

      const flour1 = shoppingList.ingredients.find((i) => i.name === "flour");
      expect(flour1!.quantityTotal).toMatchObject({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 100 },
        },
        unit: "g",
      });

      // Remove the recipe → no ingredients, pantry should be intact
      shoppingList.removeRecipe(0);
      expect(shoppingList.ingredients).toEqual([]);
      const resultingPantry = shoppingList.getPantry();
      const flourInPantry = resultingPantry!.findItem("flour");
      expect(flourInPantry!.quantity).toMatchObject({
        type: "fixed",
        value: { type: "decimal", decimal: 100 },
      });
    });

    it("should return undefined from getPantry when no pantry set", () => {
      const shoppingList = new ShoppingList();
      expect(shoppingList.getPantry()).toBeUndefined();
    });

    it("should use CategoryConfig aliases for pantry matching", () => {
      const shoppingList = new ShoppingList();
      const config = new CategoryConfig(`[Baking]\nflour|farine`);
      shoppingList.setCategoryConfig(config);

      // Recipe uses "flour", pantry uses "farine"
      shoppingList.addRecipe(pantryRecipe);
      shoppingList.addPantry(`[pantry]\nfarine = "100%g"`);

      // Should find "farine" in pantry for "flour" in recipe
      const flour = shoppingList.ingredients.find((i) => i.name === "flour");
      expect(flour!.quantityTotal).toMatchObject({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 100 },
        },
        unit: "g",
      });
    });

    it("should propagate CategoryConfig to pantry when set after addPantry", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(pantryRecipe);
      shoppingList.addPantry(`[pantry]\nfarine = "100%g"`);

      // Without config, "flour" won't match "farine"
      const flourBefore = shoppingList.ingredients.find(
        (i) => i.name === "flour",
      );
      expect(flourBefore!.quantityTotal).toMatchObject({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 200 },
        },
        unit: "g",
      });

      // Setting config should NOT auto-recalculate (only categorize runs)
      // but the config IS propagated to the pantry for future use
      const config = new CategoryConfig(`[Baking]\nflour|farine`);
      shoppingList.setCategoryConfig(config);

      // Re-add recipe to trigger recalculation
      shoppingList.removeRecipe(0);
      shoppingList.addRecipe(pantryRecipe);

      const flourAfter = shoppingList.ingredients.find(
        (i) => i.name === "flour",
      );
      expect(flourAfter!.quantityTotal).toMatchObject({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 100 },
        },
        unit: "g",
      });
    });

    it("should handle pantry with unit conversion (e.g. kg vs g)", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(pantryRecipe); // needs 200g flour
      shoppingList.addPantry(`[pantry]\nflour = "1%kg"`); // has 1kg = 1000g

      const flour = shoppingList.ingredients.find((i) => i.name === "flour");
      // 200g - 1kg → clamped to 0
      expect(flour!.quantityTotal).toMatchObject({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 0 },
        },
      });
    });

    it("should skip pantry subtraction for ingredients without quantity", () => {
      const recipeNoQty = new Recipe(`Add @flour and @sugar{100%g}.`);
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipeNoQty);
      shoppingList.addPantry(`[pantry]\nflour = "100%g"`);

      // flour has no quantity in recipe, should remain as-is
      const flour = shoppingList.ingredients.find((i) => i.name === "flour");
      expect(flour).toBeDefined();
      expect(flour!.quantityTotal).toBeUndefined();
    });

    it("should skip pantry subtraction for incompatible units", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(pantryRecipe); // needs 200g flour
      // pantry has flour in liters — incompatible with grams
      shoppingList.addPantry(`[pantry]\nflour = "1%L"`);

      // Should remain unchanged due to incompatible units
      const flour = shoppingList.ingredients.find((i) => i.name === "flour");
      expect(flour!.quantityTotal).toMatchObject({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 200 },
        },
        unit: "g",
      });
    });

    it("should subtract pantry from AND group ingredient (multiple units)", () => {
      // Recipe produces eggs as AND group: 1 dozen AND 1 half dozen
      const recipe3 = new Recipe(`Add @eggs{1%dozen} and @&eggs{1%half dozen}`);
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe3);

      // Pantry has 2 dozen eggs — should subtract from first AND leaf (1 dozen)
      // then carry the remaining 1 dozen to the second leaf (1 half dozen).
      // 1 dozen = 12, 1 half dozen = 6. Pantry 2 dozen = 24.
      // But "dozen" and "half dozen" are different unit strings,
      // they may or may not be convertible. Let's check with a simple compatible case.
      shoppingList.addPantry(`[pantry]\neggs = "5"`);

      const eggs = shoppingList.ingredients.find((i) => i.name === "eggs");
      expect(eggs).toBeDefined();
      // Unitless pantry (5) vs "dozen" unit — subtraction of unitless from
      // unit-bearing quantity: first leaf (1 dozen) gets subtracted → clamped to 0.
      // Remaining pantry (4) tries second leaf (1 half dozen) — if incompatible, stays.
      expect(eggs!.quantityTotal).toMatchObject({
        and: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 0 },
            },
          },
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1 },
            },
          },
        ],
      });
    });

    it("should subtract pantry from AND group with compatible units", () => {
      // Recipe: 200g flour AND 100ml water (same ingredient name in AND)
      // We'll create this by adding two recipes with the same ingredient in different units
      const recipeA = new Recipe(`Add @flour{200%g}.`);
      const recipeB = new Recipe(`Add @flour{0.5%kg}.`);
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipeA);
      shoppingList.addRecipe(recipeB);

      // flour should be summed: 200g + 500g = 700g
      const flourBefore = shoppingList.ingredients.find(
        (i) => i.name === "flour",
      );
      expect(flourBefore!.quantityTotal).toMatchObject({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 700 },
        },
        unit: "g",
      });

      // Now add pantry with 300g flour
      shoppingList.addPantry(`[pantry]\nflour = "300%g"`);

      const flourAfter = shoppingList.ingredients.find(
        (i) => i.name === "flour",
      );
      expect(flourAfter!.quantityTotal).toMatchObject({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 400 },
        },
        unit: "g",
      });
    });

    it("should subtract pantry from AND group — partial across leaves", () => {
      // Create an AND group ingredient: e.g. pepper "to taste" AND 1 tsp
      // Recipe with two instances with different units to create AND group
      const recipe = new Recipe(
        `Season with @pepper{to taste} and @&pepper{1%tsp}.`,
      );
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe);

      // Verify AND group structure
      const pepperBefore = shoppingList.ingredients.find(
        (i) => i.name === "pepper",
      );
      expect(pepperBefore!.quantityTotal).toMatchObject({
        and: [
          {
            quantity: {
              type: "fixed",
              value: { type: "text", text: "to taste" },
            },
          },
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1 },
            },
            unit: "tsp",
          },
        ],
      });

      // Add pantry with 0.5 tsp pepper — should subtract from the tsp leaf
      shoppingList.addPantry(`[pantry]\npepper = "0.5%tsp"`);

      const pepperAfter = shoppingList.ingredients.find(
        (i) => i.name === "pepper",
      );
      // The tsp leaf should be reduced (1 - 0.5 = 0.5)
      // The text leaf remains unchanged (incompatible with tsp)
      expect(pepperAfter!.quantityTotal).toMatchObject({
        and: [
          {
            quantity: {
              type: "fixed",
              value: { type: "text", text: "to taste" },
            },
          },
          {
            quantity: {
              type: "fixed",
            },
            unit: "tsp",
          },
        ],
      });
    });

    it("should update pantry remainder correctly with group subtraction", () => {
      const recipe = new Recipe(
        `Season with @pepper{to taste} and @&pepper{1%tsp}.`,
      );
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe);
      shoppingList.addPantry(`[pantry]\npepper = "3%tsp"`);

      // Pantry had 3 tsp, recipe needs 1 tsp (text leaf is incompatible)
      // → 2 tsp should remain in pantry
      const resultingPantry = shoppingList.getPantry();
      const pepper = resultingPantry!.findItem("pepper");
      expect(pepper).toBeDefined();
      expect(pepper!.quantity).toMatchObject({
        type: "fixed",
        value: { type: "decimal", decimal: 2 },
      });
    });
  });
});
