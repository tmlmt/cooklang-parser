import { describe, it, expect } from "vitest";
import { Recipe } from "../src/classes/recipe";
import {
  recipeWithComplexAlternatives,
  recipeWithGroupedAlternatives,
  recipeWithInlineAlternatives,
  recipeWithSubgroupAlternatives,
} from "./fixtures/recipes";
import { RecipeChoices, Section, Step } from "../src";

describe("getIngredientQuantities", () => {
  it("should return all ingredients but only primary has quantities when no choices are provided", () => {
    const recipe = new Recipe(recipeWithInlineAlternatives);
    // When no choices are made, ALL ingredients are returned (so alternative indices are valid)
    // but only the primary (index 0) gets quantities populated
    const ingredients = recipe.getIngredientQuantities();
    expect(ingredients.length).toBe(3); // milk, almond milk, oat milk

    const milkIngredient = ingredients.find((ing) => ing.name === "milk");
    expect(milkIngredient).toBeDefined();
    expect(milkIngredient?.usedAsPrimary).toBe(true);
    expect(milkIngredient?.quantities).toEqual([
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 200 } },
        unit: "ml",
        alternatives: [
          [
            {
              index: 1,
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
          ],
          [
            {
              index: 2,
              quantities: [
                {
                  quantity: {
                    type: "fixed",
                    value: { type: "decimal", decimal: 150 },
                  },
                  unit: "ml",
                },
              ],
            },
          ],
        ],
      },
    ]);

    // Alternatives should be in the result but without quantities
    const almondMilk = ingredients.find((ing) => ing.name === "almond milk");
    expect(almondMilk).toBeDefined();
    expect(almondMilk?.quantities).toBeUndefined();
    expect(almondMilk?.usedAsPrimary).toBeUndefined();

    const soyMilkFromInline = ingredients.find(
      (ing) => ing.name === "soy milk",
    );
    expect(soyMilkFromInline).toBeDefined();
    expect(soyMilkFromInline?.quantities).toBeUndefined();
    expect(soyMilkFromInline?.usedAsPrimary).toBeUndefined();

    // Grouped alternatives: when no choices are made, only primary gets quantities
    const recipe2 = new Recipe(recipeWithGroupedAlternatives);
    const ingredients2 = recipe2.getIngredientQuantities();
    expect(ingredients2.length).toBe(3); // milk, almond milk, soy milk

    const milkIngredient2 = ingredients2.find((ing) => ing.name === "milk");
    expect(milkIngredient2).toBeDefined();
    expect(milkIngredient2?.usedAsPrimary).toBe(true);
  });

  it("should calculate ingredients quantities correctly for complex combinations", () => {
    const recipe = new Recipe(`
Add @water{1%cup}|juice{1%cup} and @&water{100%g}|&juice{100%g}
`);
    const ingredients = recipe.getIngredientQuantities();
    expect(ingredients).toEqual([
      {
        name: "water",
        quantities: [
          {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
            unit: "cup",
            alternatives: [
              [
                {
                  index: 1,
                  quantities: [
                    {
                      quantity: {
                        type: "fixed",
                        value: { type: "decimal", decimal: 1 },
                      },
                      unit: "cup",
                    },
                  ],
                },
              ],
            ],
          },
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 100 },
            },
            unit: "g",
            alternatives: [
              [
                {
                  index: 1,
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
              ],
            ],
          },
        ],
        usedAsPrimary: true,
      },
      {
        name: "juice",
      },
    ]);
  });

  it("should calculate ingredients quantities for a specific section", () => {
    const recipe = new Recipe(`
= Section 1

Add @eggs{1}

= Section 2

Add @flour{200%g}`);
    const section2 = recipe.sections[1];
    // Passing the section itself
    const ingredientsSection2 = recipe.getIngredientQuantities({
      section: section2,
    });
    expect(ingredientsSection2.length).toBe(1);
    const ingredientsSection2Object = {
      name: "flour",
      quantities: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 200 } },
          unit: "g",
        },
      ],
      usedAsPrimary: true,
    };
    expect(ingredientsSection2[0]).toEqual(ingredientsSection2Object);
    // Passing the section index
    const ingredientsSection2ByIndex = recipe.getIngredientQuantities({
      section: 1,
    });
    expect(ingredientsSection2ByIndex.length).toBe(1);
    expect(ingredientsSection2ByIndex[0]).toEqual(ingredientsSection2Object);
    // Passing an non-existing section index
    const ingredientsSection3ByIndex = recipe.getIngredientQuantities({
      section: 2,
    });
    expect(ingredientsSection3ByIndex.length).toBe(0);
  });

  it("should calculate ingredients quantities for a specific step", () => {
    const recipe = new Recipe(`
= Section 1

Add @eggs{1}

= Section 2

Add @flour{200%g}

Mix well.

Add @sugar{50%g}`);
    const section2 = recipe.sections[1] as Section;
    const step1 = section2.content[2] as Step;
    // Passing the step itself
    const ingredientsStep1 = recipe.getIngredientQuantities({
      step: step1,
    });
    expect(ingredientsStep1.length).toBe(1);
    const ingredientsStep1Object = {
      name: "sugar",
      quantities: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 50 } },
          unit: "g",
        },
      ],
      usedAsPrimary: true,
    };
    expect(ingredientsStep1[0]).toEqual(ingredientsStep1Object);
    // Passing the step index (within section)
    const ingredientsStep1ByIndex = recipe.getIngredientQuantities({
      step: 2,
      section: 1,
    });
    expect(ingredientsStep1ByIndex.length).toBe(1);
    expect(ingredientsStep1ByIndex[0]).toEqual(ingredientsStep1Object);
    // Passing a non-existant step index
    const ingredientsStep3ByIndex = recipe.getIngredientQuantities({
      step: 3,
      section: 1,
    });
    expect(ingredientsStep3ByIndex.length).toBe(0);
  });

  it("should calculate ingredient quantities with specific choices (no alternatives listed)", () => {
    const recipe = new Recipe(recipeWithInlineAlternatives);
    // For inline alternatives, the key is the ingredient item ID
    // When an explicit choice is made, alternatives should NOT be listed
    const choices: RecipeChoices = {
      ingredientItems: new Map([["ingredient-item-0", 1]]),
    };
    const ingredients = recipe.getIngredientQuantities({ choices });
    // All 3 ingredients returned, but only selected one has quantities
    expect(ingredients.length).toBe(3);
    const almondMilk = ingredients.find((ing) => ing.name === "almond milk");
    expect(almondMilk).toBeDefined();
    // No alternatives when explicit choice is made
    expect(almondMilk?.quantities).toEqual([
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
        unit: "ml",
      },
    ]);
    // Not primary since it's not the first alternative
    expect(almondMilk?.usedAsPrimary).toBe(true); // It IS primary because it was selected

    // Primary should exist but without quantities
    const milk = ingredients.find((ing) => ing.name === "milk");
    expect(milk).toBeDefined();
    expect(milk?.quantities).toBeUndefined();
    expect(milk?.usedAsPrimary).toBeUndefined(); // Not primary - wasn't selected

    const recipe2 = new Recipe(recipeWithGroupedAlternatives);
    // For grouped alternatives, the key is the group name and goes in ingredientGroups
    const choices2: RecipeChoices = {
      ingredientGroups: new Map([["milk", 2]]),
    };
    const ingredients2 = recipe2.getIngredientQuantities({ choices: choices2 });
    // All 3 ingredients returned
    expect(ingredients2.length).toBe(3);
    const soyMilk = ingredients2.find((ing) => ing.name === "soy milk");
    expect(soyMilk).toBeDefined();
    // No alternatives when explicit choice is made
    expect(soyMilk?.quantities).toEqual([
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 150 } },
        unit: "ml",
      },
    ]);
    // Primary because it was selected
    expect(soyMilk?.usedAsPrimary).toBe(true);
  });

  it("correctly calculate ingredients quantities for complex alternatives", () => {
    const recipe = new Recipe(recipeWithComplexAlternatives);
    // Explicit choice made - no alternatives should be listed
    const choices: RecipeChoices = {
      ingredientGroups: new Map([["dough", 0]]),
    };
    const ingredients = recipe.getIngredientQuantities({ choices });
    // Both dough and flour/butter should be in result
    expect(ingredients.length).toBe(2);
    const doughIngredient = ingredients.find((ing) => ing.name === "dough");
    expect(doughIngredient).toBeDefined();
    expect(doughIngredient).toEqual({
      name: "dough",
      quantities: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        },
      ],
      usedAsPrimary: true,
      preparation: "defrosted",
      flags: ["recipe"],
      extras: { path: "dough.cook" },
    });
  });

  it("should handle alternatives with AND groups (incompatible units)", () => {
    // This test covers the branch where alternative quantities form an AND group
    // because they have incompatible units that can't be summed
    const recipe = new Recipe(`
Add @potato{1%=large|1.5%cup}|carrot{1%large} and @&potato{1%=small|0.5%cup}|&carrot{2%small}
`);
    const ingredients = recipe.getIngredientQuantities();
    expect(ingredients).toHaveLength(2);

    const potato = ingredients.find((ing) => ing.name === "potato");
    expect(potato).toBeDefined();
    // Potato has an AND group (large + small) with equivalents (cups summed)
    // The alternative (carrot) also has incompatible units forming an AND group
    expect(potato?.quantities).toHaveLength(1);
    expect(potato?.quantities?.[0]).toHaveProperty("and");

    const potatoQty = potato?.quantities?.[0] as {
      and: unknown[];
      equivalents?: unknown[];
      alternatives?: { index: number; quantities: unknown[] }[];
    };
    expect(potatoQty).toEqual({
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
      alternatives: [
        [
          {
            index: 1,
            quantities: [
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
                  value: { type: "decimal", decimal: 2 },
                },
                unit: "small",
              },
            ],
          },
        ],
      ],
    });
  });

  describe("subgroup alternatives", () => {
    it("selects the first subgroup (multiple bound ingredients) by default", () => {
      const recipe = new Recipe(recipeWithSubgroupAlternatives);
      const ingredients = recipe.getIngredientQuantities();
      // Default (index 0) selects subgroup "1": milk + sugar
      const milk = ingredients.find((ing) => ing.name === "milk");
      expect(milk?.usedAsPrimary).toBe(true);
      expect(milk?.quantities).toBeDefined();
      expect(milk?.quantities?.[0]).toMatchObject({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 1 },
        },
        unit: "L",
      });

      const sugar = ingredients.find((ing) => ing.name === "sugar");
      expect(sugar?.usedAsPrimary).toBe(true);
      expect(sugar?.quantities).toBeDefined();
      expect(sugar?.quantities?.[0]).toMatchObject({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 1 },
        },
        unit: "tsp",
      });

      // Non-selected ingredients should not have quantities or usedAsPrimary
      const oatMilk = ingredients.find((ing) => ing.name === "oat milk");
      expect(oatMilk?.usedAsPrimary).toBeUndefined();
      expect(oatMilk?.quantities).toBeUndefined();
    });

    it("selects a multi-ingredient subgroup with explicit choice", () => {
      const recipe = new Recipe(recipeWithSubgroupAlternatives);
      // Choose subgroup index 1 (subgroup "2"): oat milk + honey
      const choices: RecipeChoices = {
        ingredientGroups: new Map([["sweetener", 1]]),
      };
      const ingredients = recipe.getIngredientQuantities({ choices });

      const oatMilk = ingredients.find((ing) => ing.name === "oat milk");
      expect(oatMilk?.usedAsPrimary).toBe(true);
      expect(oatMilk?.quantities).toBeDefined();

      const honey = ingredients.find((ing) => ing.name === "honey");
      expect(honey?.usedAsPrimary).toBe(true);
      expect(honey?.quantities).toBeDefined();

      // Others should not be selected
      const milk = ingredients.find((ing) => ing.name === "milk");
      expect(milk?.usedAsPrimary).toBeUndefined();
      expect(milk?.quantities).toBeUndefined();
    });

    it("selects a single-ingredient subgroup with explicit choice", () => {
      const recipe = new Recipe(recipeWithSubgroupAlternatives);
      // Choose subgroup index 2 (subgroup "3"): syrup alone
      const choices: RecipeChoices = {
        ingredientGroups: new Map([["sweetener", 2]]),
      };
      const ingredients = recipe.getIngredientQuantities({ choices });

      const syrup = ingredients.find((ing) => ing.name === "syrup");
      expect(syrup?.usedAsPrimary).toBe(true);
      expect(syrup?.quantities).toBeUndefined();

      // All others should not be selected
      const milk = ingredients.find((ing) => ing.name === "milk");
      expect(milk?.usedAsPrimary).toBeUndefined();
    });

    it("selects a bare-group (no subgroup key) subgroup with explicit choice", () => {
      const recipe = new Recipe(recipeWithSubgroupAlternatives);
      // Choose subgroup index 3: sweet cream (no subgroup key)
      const choices: RecipeChoices = {
        ingredientGroups: new Map([["sweetener", 3]]),
      };
      const ingredients = recipe.getIngredientQuantities({ choices });

      const sweetCream = ingredients.find((ing) => ing.name === "sweet cream");
      expect(sweetCream?.usedAsPrimary).toBe(true);
      expect(sweetCream?.quantities).toBeDefined();
    });

    it("handles out-of-bounds subgroup choice index gracefully", () => {
      const recipe = new Recipe(recipeWithSubgroupAlternatives);
      // Pass an index that exceeds the number of subgroups
      const choices: RecipeChoices = {
        ingredientGroups: new Map([["sweetener", 99]]),
      };
      const ingredients = recipe.getIngredientQuantities({ choices });

      // No grouped ingredient should be selected
      const milk = ingredients.find((ing) => ing.name === "milk");
      expect(milk?.usedAsPrimary).toBeUndefined();
      expect(milk?.quantities).toBeUndefined();

      const syrup = ingredients.find((ing) => ing.name === "syrup");
      expect(syrup?.usedAsPrimary).toBeUndefined();
      expect(syrup?.quantities).toBeUndefined();
    });
  });
});
