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
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 100 },
              },
              unit: "g",
            },
          ],
        },
        {
          name: "sugar",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 50 },
              },
              unit: "g",
            },
          ],
        },
        {
          name: "eggs",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 2 },
              },
            },
          ],
        },
        {
          name: "milk",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 200 },
              },
              unit: "ml",
            },
          ],
        },
        {
          name: "pepper",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "text", text: "to taste" },
              },
            },
          ],
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
        quantities: [
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
      });
    });

    it("should merge ingredients from multiple recipes", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe1);
      shoppingList.addRecipe(recipe2);
      expect(shoppingList.ingredients).toEqual([
        {
          name: "flour",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 150 },
              },
              unit: "g",
            },
          ],
        },
        {
          name: "sugar",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 50 },
              },
              unit: "g",
            },
          ],
        },
        {
          name: "eggs",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 3 },
              },
            },
          ],
        },
        {
          name: "milk",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 200 },
              },
              unit: "ml",
            },
          ],
        },
        {
          name: "pepper",
          quantities: [
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
        {
          name: "spices",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: "pinch",
            },
          ],
        },
        {
          name: "butter",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 25 },
              },
              unit: "g",
            },
          ],
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
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 200 },
              },
              unit: "g",
            },
          ],
        },
        {
          name: "sugar",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 100 },
              },
              unit: "g",
            },
          ],
        },
        {
          name: "eggs",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 4 },
              },
            },
          ],
        },
        {
          name: "milk",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 400 },
              },
              unit: "ml",
            },
          ],
        },
        {
          name: "pepper",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "text", text: "to taste" },
              },
            },
          ],
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
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 200 },
              },
              unit: "g",
            },
          ],
        },
        {
          name: "sugar",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 100 },
              },
              unit: "g",
            },
          ],
        },
        {
          name: "eggs",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 4 },
              },
            },
          ],
        },
        {
          name: "milk",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 400 },
              },
              unit: "ml",
            },
          ],
        },
        {
          name: "pepper",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "text", text: "to taste" },
              },
            },
          ],
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
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 300 },
              },
              unit: "g",
            },
          ],
        },
        {
          name: "sugar",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 150 },
              },
              unit: "g",
            },
          ],
        },
        {
          name: "eggs",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 6 },
              },
            },
          ],
        },
        {
          name: "milk",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 600 },
              },
              unit: "ml",
            },
          ],
        },
        {
          name: "pepper",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "text", text: "to taste" },
              },
            },
          ],
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
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 100 },
              },
              unit: "ml",
            },
          ],
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
      // large: 1+2=3, small: 1+3=4, cup equivalents: 2+4.5=6.5
      expect(potato?.quantities).toMatchObject([
        {
          and: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: "large",
            },
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: "small",
            },
          ],
          equivalents: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 2 },
              },
              unit: "cup",
            },
          ],
        },
      ]);
    });

    it("should merge AND groups with different unit sets across recipes", () => {
      // Recipe A has AND group with "large" and "small" units
      const recipeA = new Recipe(
        `Add @potato{1%=large|1.5%cup} and @&potato{1%=small|0.5%cup}`,
      );
      // Recipe B has AND group with "large", "small", AND an extra unit "medium"
      const recipeB = new Recipe(
        `Add @potato{2%=large|2%cup} and @&potato{3%=small|1%cup} and @&potato{1%=medium|0.5%cup}`,
      );
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipeA);
      shoppingList.addRecipe(recipeB);
      const potato = shoppingList.ingredients.find((i) => i.name === "potato");
      expect(potato).toBeDefined();
      // Unified approach: all raw quantities combined and processed once
      // large: 1+2=3, small: 1+3=4, medium: 0+1=1
      // first ratio is retained so cup: 3*1.5+4*0.5+1*0.5 = 7
      expect(potato?.quantities).toMatchObject([
        {
          and: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 3 },
              },
              unit: "large",
            },
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 4 },
              },
              unit: "small",
            },
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: "medium",
            },
          ],
          equivalents: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 7 },
              },
              unit: "cup",
            },
          ],
        },
      ]);
    });

    it("should subtract pantry from AND group entries individually", () => {
      // Recipe with equivalents that produce a real { and: [...] } group in quantities
      const recipe = new Recipe(
        `Add @potato{1%=large|1.5%cup} and @&potato{1%=small|0.5%cup}`,
      );
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe);

      // Pantry has 5 large — should subtract from the "large" entry only
      shoppingList.addPantry(`[pantry]\npotato = "5%large"`);

      const potato = shoppingList.ingredients.find((i) => i.name === "potato");
      expect(potato).toBeDefined();
      // large: 1-5 = 0 (clamped), small: incompatible unit → stays 1
      expect(potato?.quantities).toMatchObject([
        {
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 1 },
          },
          unit: "small",
          equivalents: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 0.5 },
              },
              unit: "cup",
            },
          ],
        },
      ]);
    });

    it("should push AND group when no existing AND group for that ingredient", () => {
      // First recipe has a simple unitless quantity, second has an AND group
      // Unified approach: all raw quantities combined → addEquivalentsAndSimplify
      // Unitless quantity stays separate from the equivalence AND group (large + small with cup equivalents)
      const recipeSimple = new Recipe(`Add @potato{3}`);
      const recipeAnd = new Recipe(
        `Add @potato{1%=large|1.5%cup} and @&potato{1%=small|0.5%cup}`,
      );
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipeSimple);
      shoppingList.addRecipe(recipeAnd);
      const potato = shoppingList.ingredients.find((i) => i.name === "potato");
      expect(potato).toBeDefined();
      // Should have AND group (large + small with cup equivalents) + separate unitless entry
      const quantities = potato?.quantities;
      expect(quantities).toHaveLength(2);
      expect(quantities![0]).toMatchObject({
        and: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1 },
            },
            unit: "large",
          },
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1 },
            },
            unit: "small",
          },
        ],
        equivalents: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 2 },
            },
            unit: "cup",
          },
        ],
      });
      expect(quantities![1]).toMatchObject({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 3 },
        },
      });
    });

    it("should append unmatched equivalent units during AND group merge", () => {
      // Recipe A has AND group with no equivalents
      // Recipe B has AND group with ml equivalents
      // Unified approach: all raw quantities combined, equivalents computed proportionally
      const recipeA = new Recipe(`Add @fruit{1%=large} and @&fruit{1%=small}`);
      const recipeB = new Recipe(
        `Add @fruit{2%=large|50%ml} and @&fruit{3%=small|90%ml}`,
      );
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipeA);
      shoppingList.addRecipe(recipeB);
      const fruit = shoppingList.ingredients.find((i) => i.name === "fruit");
      expect(fruit).toBeDefined();
      // large: 1+2=3, small: 1+3=4
      // ml equivalents recomputed proportionally from recipe B ratios: 195ml
      expect(fruit?.quantities).toMatchObject([
        {
          and: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 3 },
              },
              unit: "large",
            },
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 4 },
              },
              unit: "small",
            },
          ],
          equivalents: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 195 },
              },
              unit: "ml",
            },
          ],
        },
      ]);
    });

    it("should combine incompatible units from different recipes into single AND group", () => {
      // Recipe A has entries with equivalents (g|ml) plus incompatible unit (=large)
      // Recipe B has an explicit AND group (big|ml + tiny|ml)
      // Unified approach: all raw quantities combined into single addEquivalentsAndSimplify call
      // → g, big, tiny share ml equivalents → AND group; large is standalone (no equivalence)
      const recipeA = new Recipe(
        `Add @fruit{1%g|300%ml} then add @fruit{1%=large}`,
      );
      const recipeB = new Recipe(
        `Add @fruit{2%=big|400%ml} and @&fruit{3%=tiny|200%ml}`,
      );
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipeA);
      shoppingList.addRecipe(recipeB);
      const fruit = shoppingList.ingredients.find((i) => i.name === "fruit");
      expect(fruit).toBeDefined();
      // g, big, tiny in AND group with ml equivalents; large separate
      expect(fruit?.quantities).toHaveLength(2);
      expect(fruit?.quantities?.[0]).toMatchObject({
        and: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1 },
            },
            unit: "g",
          },
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 2 },
            },
            unit: "big",
          },
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 3 },
            },
            unit: "tiny",
          },
        ],
        equivalents: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 900 },
            },
            unit: "ml",
          },
        ],
      });
      expect(fruit?.quantities?.[1]).toMatchObject({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 1 },
        },
        unit: "large",
      });
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

    it("should only require choices expected for the selected variant", () => {
      const shoppingList = new ShoppingList();
      const recipeWithVariantLinkedChoices = new Recipe(`
---
servings: 1
---
[*] Add @milk{200%ml}|oat milk{200%ml}.

[vegan] Add @water{100%ml}|broth{100%ml}.

[*] Use @|protein|chicken{200%g} or @|protein|turkey{200%g}.

[vegan] Use @|protein|tofu{200%g} or @|protein|tempeh{200%g}.
`);

      expect(() =>
        shoppingList.addRecipe(recipeWithVariantLinkedChoices, {
          choices: {
            variant: "vegan",
            ingredientItems: new Map([["ingredient-item-1", 1]]),
            ingredientGroups: new Map([["protein", 1]]),
          },
        }),
      ).not.toThrow();
    });

    it("should only require choices expected for the default variant", () => {
      const shoppingList = new ShoppingList();
      const recipeWithVariantLinkedChoices = new Recipe(`
---
servings: 1
---
[*] Add @milk{200%ml}|oat milk{200%ml}.

[vegan] Add @water{100%ml}|broth{100%ml}[for vegan].

[*] Use @|protein|chicken{200%g} or @|protein|turkey{200%g}.

[vegan] Use @|protein|tofu{200%g}[for vegan] or @|protein|tempeh{200%g}[for vegan].
`);

      expect(() =>
        shoppingList.addRecipe(recipeWithVariantLinkedChoices, {
          choices: {
            ingredientItems: new Map([["ingredient-item-0", 1]]),
            ingredientGroups: new Map([["protein", 1]]),
          },
        }),
      ).not.toThrow();
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
            quantities: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 150 },
                },
                unit: "g",
              },
            ],
          },
          {
            name: "sugar",
            quantities: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 50 },
                },
                unit: "g",
              },
            ],
          },
        ],
        Dairy: [
          {
            name: "butter",
            quantities: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 25 },
                },
                unit: "g",
              },
            ],
          },
          {
            name: "milk",
            quantities: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 200 },
                },
                unit: "ml",
              },
            ],
          },
        ],
        other: [
          {
            name: "eggs",
            quantities: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 3 },
                },
              },
            ],
          },
          {
            name: "pepper",
            quantities: [
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
          {
            name: "spices",
            quantities: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 1 },
                },
                unit: "pinch",
              },
            ],
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
            quantities: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 100 },
                },
                unit: "g",
              },
            ],
          },
          {
            name: "sugar",
            quantities: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 50 },
                },
                unit: "g",
              },
            ],
          },
          {
            name: "eggs",
            quantities: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 2 },
                },
              },
            ],
          },
          {
            name: "milk",
            quantities: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 200 },
                },
                unit: "ml",
              },
            ],
          },
          {
            name: "pepper",
            quantities: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "text", text: "to taste" },
                },
              },
            ],
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
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 50 },
              },
              unit: "g",
            },
          ],
        },
        {
          name: "butter",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 25 },
              },
              unit: "g",
            },
          ],
        },
        {
          name: "eggs",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
            },
          ],
        },
        {
          name: "pepper",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: "tsp",
            },
          ],
        },
        {
          name: "spices",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: "pinch",
            },
          ],
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
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 150 },
              },
              unit: "g",
            },
          ],
        },
      ]);
      shoppingList.removeRecipe(0);
      expect(shoppingList.categories?.Bakery).toEqual([
        {
          name: "flour",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 50 },
              },
              unit: "g",
            },
          ],
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
      expect(flour!.quantities).toMatchObject([
        {
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 100 },
          },
          unit: "g",
        },
      ]);
    });

    it("should remove ingredient when pantry fully covers it", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(pantryRecipe);
      shoppingList.addPantry(`[pantry]\nflour = "500%g"`);

      const flour = shoppingList.ingredients.find((i) => i.name === "flour");
      expect(flour).toBeDefined();
      expect(flour!.quantities).toBeUndefined();
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
      expect(sugar!.quantities).toMatchObject([
        {
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 100 },
          },
          unit: "g",
        },
      ]);
    });

    it("should accept a Pantry instance", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(pantryRecipe);
      const pantry = new Pantry(`[pantry]\nflour = "100%g"`);
      shoppingList.addPantry(pantry);

      const flour = shoppingList.ingredients.find((i) => i.name === "flour");
      expect(flour!.quantities).toMatchObject([
        {
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 100 },
          },
          unit: "g",
        },
      ]);
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
      expect(flour1!.quantities).toMatchObject([
        {
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 100 },
          },
          unit: "g",
        },
      ]);

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
      expect(flour!.quantities).toMatchObject([
        {
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 100 },
          },
          unit: "g",
        },
      ]);
    });

    it("should propagate CategoryConfig to pantry when set after addPantry", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(pantryRecipe);
      shoppingList.addPantry(`[pantry]\nfarine = "100%g"`);

      // Without config, "flour" won't match "farine"
      const flourBefore = shoppingList.ingredients.find(
        (i) => i.name === "flour",
      );
      expect(flourBefore!.quantities).toMatchObject([
        {
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 200 },
          },
          unit: "g",
        },
      ]);

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
      expect(flourAfter!.quantities).toMatchObject([
        {
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 100 },
          },
          unit: "g",
        },
      ]);
    });

    it("should handle pantry with unit conversion (e.g. kg vs g)", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(pantryRecipe); // needs 200g flour
      shoppingList.addPantry(`[pantry]\nflour = "1%kg"`); // has 1kg = 1000g

      const flour = shoppingList.ingredients.find((i) => i.name === "flour");
      // 200g - 1kg → fully covered, quantities removed
      expect(flour!.quantities).toBeUndefined();
    });

    it("should skip pantry subtraction for ingredients without quantity", () => {
      const recipeNoQty = new Recipe(`Add @flour and @sugar{100%g}.`);
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipeNoQty);
      shoppingList.addPantry(`[pantry]\nflour = "100%g"`);

      // flour has no quantity in recipe, should remain as-is
      const flour = shoppingList.ingredients.find((i) => i.name === "flour");
      expect(flour).toBeDefined();
      expect(flour!.quantities).toBeUndefined();
    });

    it("should skip pantry substraction for ingredients without compatible units", () => {
      const recipe = new Recipe(
        `Add @eggs{2%dozen|2%large pack} and @&eggs{1%half dozen|1%small pack}`,
      );
      const shoppingList = new ShoppingList();
      shoppingList.addPantry(`[pantry]\neggs = "40"`);
      shoppingList.addRecipe(recipe);
      const resultingPantry = shoppingList.getPantry();
      const pantryEggs = resultingPantry!.findItem("eggs");
      expect(pantryEggs).toBeDefined();
      expect(pantryEggs!.quantity).toMatchObject({
        type: "fixed",
        value: { type: "decimal", decimal: 40 },
      });
    });

    it("should skip pantry subtraction for incompatible units", () => {
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(pantryRecipe); // needs 200g flour
      // pantry has flour in liters — incompatible with grams
      shoppingList.addPantry(`[pantry]\nflour = "1%L"`);

      // Should remain unchanged due to incompatible units
      const flour = shoppingList.ingredients.find((i) => i.name === "flour");
      expect(flour!.quantities).toMatchObject([
        {
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 200 },
          },
          unit: "g",
        },
      ]);
    });

    it("should subtract pantry for quantities with equivalents", () => {
      const recipe3 = new Recipe(
        `Add @eggs{24|2%dozen} and @&eggs{6|1%half dozen}`,
      );
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe3);
      // 30 eggs total (unitless) with equivalents: 2.5 dozen, 5 half dozen
      // Pantry has 1 dozen = 12 eggs (via equivalence ratio)
      // After subtraction: 30 - 12 = 18 eggs, equivalents recomputed
      shoppingList.addPantry(`[pantry]\neggs = "1%dozen"`);

      const eggs = shoppingList.ingredients.find((i) => i.name === "eggs");
      expect(eggs).toBeDefined();
      expect(eggs!.quantities).toEqual([
        {
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 18 },
          },
          equivalents: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1.5 },
              },
              unit: "dozen",
            },
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 3 },
              },
              unit: "half dozen",
            },
          ],
        },
      ]);
    });

    it("should remove ingredient when pantry fully covers via equivalence ratio", () => {
      // Recipe: 24 eggs (= 2 dozen) AND 6 eggs (= 1 half dozen), total 30 eggs
      // Pantry has 3 dozen = 36 eggs → exceeds recipe → ingredient removed
      const recipe = new Recipe(
        `Add @eggs{24|2%dozen} and @&eggs{6|1%half dozen}`,
      );
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe);
      shoppingList.addPantry(`[pantry]\neggs = "3%dozen"`);

      const eggs = shoppingList.ingredients.find((i) => i.name === "eggs");
      expect(eggs).toBeDefined();
      expect(eggs!.quantities).toBeUndefined();

      // Pantry should have remainder: 3 dozen - 30/12 dozen = 3 - 2.5 = 0.5 dozen
      const resultingPantry = shoppingList.getPantry();
      const pantryEggs = resultingPantry!.findItem("eggs");
      expect(pantryEggs).toBeDefined();
      expect(pantryEggs!.quantity).toMatchObject({
        type: "fixed",
        value: { type: "decimal", decimal: 0.5 },
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

      // Verify flat array structure (incompatible units stored as separate entries)
      const pepperBefore = shoppingList.ingredients.find(
        (i) => i.name === "pepper",
      );
      expect(pepperBefore!.quantities).toMatchObject([
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
      ]);

      // Add pantry with 0.5 tsp pepper — should subtract from the tsp entry
      shoppingList.addPantry(`[pantry]\npepper = "0.5%tsp"`);

      const pepperAfter = shoppingList.ingredients.find(
        (i) => i.name === "pepper",
      );
      // The tsp entry should be reduced (1 - 0.5 = 0.5)
      // The text entry remains unchanged (incompatible with tsp)
      expect(pepperAfter!.quantities).toMatchObject([
        {
          quantity: {
            type: "fixed",
            value: { type: "text", text: "to taste" },
          },
        },
        {
          quantity: {
            type: "fixed",
            value: { type: "fraction", num: 1, den: 2 },
          },
          unit: "tsp",
        },
      ]);
    });

    it("should subtract pantry from AND group with equivalents", () => {
      const recipe = new Recipe(
        `Mix @milk{1%splash|10%milliliter} and @&milk{1%bottle|1%kg}.`,
      );
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe);

      shoppingList.addPantry(`[pantry]\nmilk = "2%cL"`);
      const resultingPantry = shoppingList.getPantry();
      const pantryMilk = resultingPantry!.findItem("milk");
      expect(pantryMilk).toBeDefined();
      expect(pantryMilk!.quantity).toMatchObject({
        type: "fixed",
        value: { type: "decimal", decimal: 1 },
      });
      expect(pantryMilk!.unit).toBe("cL");
    });

    it("should subtract pantry from unitless ingredient", () => {
      const recipe = new Recipe(`Add @eggs{3}.`);
      const shoppingList = new ShoppingList();
      shoppingList.addRecipe(recipe);
      shoppingList.addPantry(`[pantry]\neggs = "1"`);

      const eggs = shoppingList.ingredients.find((i) => i.name === "eggs");
      expect(eggs).toBeDefined();
      expect(eggs!.quantities).toMatchObject([
        {
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 2 },
          },
        },
      ]);
    });
  });
});
