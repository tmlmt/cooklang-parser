import { describe, it, expect } from "vitest";
import { ShoppingList } from "../src/classes/shopping_list";
import { CategoryConfig } from "../src/classes/category_config";
import type { CategorizedIngredients, Ingredient } from "../src/types";
import { Recipe } from "../src/classes/recipe";
import {
  recipeForShoppingList1,
  recipeForShoppingList2,
} from "./fixtures/recipes";

describe("ShoppingList", () => {
  const recipe1 = new Recipe(recipeForShoppingList1);
  const recipe2 = new Recipe(recipeForShoppingList2);

  describe("Adding recipes", () => {
    it("should add a recipe's ingredients", () => {
      const shoppingList = new ShoppingList();
      shoppingList.add_recipe(recipe1);
      expect(shoppingList.ingredients).toEqual([
        {
          name: "flour",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
          unit: "g",
        },
        {
          name: "sugar",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 50 } },
          unit: "g",
        },
        {
          name: "eggs",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
        },
        {
          name: "milk",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 200 } },
          unit: "ml",
        },
        {
          name: "pepper",
          quantity: {
            type: "fixed",
            value: { type: "text", value: "to taste" },
          },
        },
        { name: "spices" },
      ]);
    });

    it("should merge ingredients from multiple recipes", () => {
      const shoppingList = new ShoppingList();
      shoppingList.add_recipe(recipe1);
      shoppingList.add_recipe(recipe2);
      expect(shoppingList.ingredients).toEqual([
        {
          name: "flour",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 150 } },
          unit: "g",
        },
        {
          name: "sugar",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 50 } },
          unit: "g",
        },
        {
          name: "eggs",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 3 } },
        },
        {
          name: "milk",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 200 } },
          unit: "ml",
        },
        {
          name: "pepper",
          quantity: {
            type: "fixed",
            value: { type: "text", value: "to taste" },
          },
        },
        {
          name: "spices",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: "pinch",
        },
        {
          name: "butter",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 25 } },
          unit: "g",
        },
        {
          name: "pepper",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: "tsp",
        },
      ]);
    });

    it("should scale recipe ingredients (deprecated signature)", () => {
      const shoppingList = new ShoppingList();
      // TODO: Deprecated, to remove in v3
      shoppingList.add_recipe(recipe1, 2);
      expect(shoppingList.ingredients).toEqual([
        {
          name: "flour",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 200 } },
          unit: "g",
        },
        {
          name: "sugar",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
          unit: "g",
        },
        {
          name: "eggs",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 4 } },
        },
        {
          name: "milk",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 400 } },
          unit: "ml",
        },
        {
          name: "pepper",
          quantity: {
            type: "fixed",
            value: { type: "text", value: "to taste" },
          },
        },
        { name: "spices" },
      ]);
    });

    it("should scale recipe ingredients (using factor)", () => {
      const shoppingList = new ShoppingList();
      shoppingList.add_recipe(recipe1, { factor: 2 });
      expect(shoppingList.ingredients).toEqual([
        {
          name: "flour",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 200 } },
          unit: "g",
        },
        {
          name: "sugar",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
          unit: "g",
        },
        {
          name: "eggs",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 4 } },
        },
        {
          name: "milk",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 400 } },
          unit: "ml",
        },
        {
          name: "pepper",
          quantity: {
            type: "fixed",
            value: { type: "text", value: "to taste" },
          },
        },
        { name: "spices" },
      ]);
    });

    it("should scale recipe ingredients (using servings)", () => {
      const shoppingList = new ShoppingList();
      shoppingList.add_recipe(recipe1, { servings: 3 });
      expect(shoppingList.ingredients).toEqual([
        {
          name: "flour",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 300 } },
          unit: "g",
        },
        {
          name: "sugar",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 150 } },
          unit: "g",
        },
        {
          name: "eggs",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 6 } },
        },
        {
          name: "milk",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 600 } },
          unit: "ml",
        },
        {
          name: "pepper",
          quantity: {
            type: "fixed",
            value: { type: "text", value: "to taste" },
          },
        },
        { name: "spices" },
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
      expect(shoppingList.category_config).toBeDefined();
      expect(shoppingList.category_config?.categories.length).toBe(2);
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
      expect(shoppingList.category_config).toBeDefined();
      expect(shoppingList.category_config?.categories.length).toBe(2);
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
      shoppingList.set_category_config(config);
      expect(shoppingList.category_config).toBeDefined();
      expect(shoppingList.category_config?.categories.length).toBe(2);
    });

    it("should throw an error if an incorrect category config is provided", () => {
      const shoppingList = new ShoppingList();
      const config = 2;
      // @ts-expect-error testing a deliberate type error
      expect(() => shoppingList.set_category_config(config)).toThrowError();
    });
  });

  describe("Ingredient categorization", () => {
    it("should categorize ingredients", () => {
      const shoppingList = new ShoppingList();
      shoppingList.add_recipe(recipe1);
      shoppingList.add_recipe(recipe2);
      const config = `
[Dairy]
milk
butter

[Bakery]
flour
sugar
    `;
      shoppingList.set_category_config(config);

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
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 150 },
            },
            unit: "g",
          },
          {
            name: "sugar",
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 50 },
            },
            unit: "g",
          },
        ],
        Dairy: [
          {
            name: "butter",
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 25 },
            },
            unit: "g",
          },
          {
            name: "milk",
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 200 },
            },
            unit: "ml",
          },
        ],
        other: [
          {
            name: "eggs",
            quantity: { type: "fixed", value: { type: "decimal", decimal: 3 } },
          },
          {
            name: "pepper",
            quantity: {
              type: "fixed",
              value: { type: "text", value: "to taste" },
            },
          },
          {
            name: "pepper",
            quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
            unit: "tsp",
          },
          {
            name: "spices",
            quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
            unit: "pinch",
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
      shoppingList.add_recipe(recipe1);
      expect(shoppingList.categories).toEqual({
        other: [
          {
            name: "flour",
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 100 },
            },
            unit: "g",
          },
          {
            name: "sugar",
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 50 },
            },
            unit: "g",
          },
          {
            name: "eggs",
            quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
          },
          {
            name: "milk",
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 200 },
            },
            unit: "ml",
          },
          {
            name: "pepper",
            quantity: {
              type: "fixed",
              value: { type: "text", value: "to taste" },
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
      shoppingList.add_recipe(recipe1);
      shoppingList.add_recipe(recipe2);
      shoppingList.remove_recipe(0);
      expect(shoppingList.ingredients).toEqual([
        {
          name: "flour",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 50 } },
          unit: "g",
        },
        {
          name: "butter",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 25 } },
          unit: "g",
        },
        {
          name: "eggs",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        },
        {
          name: "pepper",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: "tsp",
        },
        {
          name: "spices",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: "pinch",
        },
      ]);
    });

    it("should remove a recipe and re-categorize ingredients", () => {
      const shoppingList = new ShoppingList();
      shoppingList.add_recipe(recipe1);
      shoppingList.add_recipe(recipe2);
      const config = `[Bakery]
                    flour`;
      shoppingList.set_category_config(config);
      expect(shoppingList.categories?.Bakery).toEqual([
        {
          name: "flour",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 150 } },
          unit: "g",
        },
      ]);
      shoppingList.remove_recipe(0);
      expect(shoppingList.categories?.Bakery).toEqual([
        {
          name: "flour",
          quantity: { type: "fixed", value: { type: "decimal", decimal: 50 } },
          unit: "g",
        },
      ]);
    });
    it("should throw an error when removing a recipe with an invalid index", () => {
      const shoppingList = new ShoppingList();
      shoppingList.add_recipe(recipe1);
      expect(() => shoppingList.remove_recipe(1)).toThrow(
        "Index out of bounds",
      );
    });
  });
});
