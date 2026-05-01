import { describe, it, expect } from "vitest";
import type {
  IngredientAlternative,
  IngredientItem,
  IngredientQuantityGroup,
  IngredientQuantityAndGroup,
  QuantityWithExtendedUnit,
  Step,
  Yield,
} from "../src/types";
import { Recipe } from "../src/classes/recipe";
import {
  recipeToScale,
  recipeToScaleSomeFixedQuantities,
  recipeWithInlineAlternatives,
} from "./fixtures/recipes";
import { recipeWithUnitServings } from "./fixtures/recipes";

describe("scaleTo", () => {
  const baseRecipe = new Recipe(recipeToScale);

  it("should scale up ingredient quantities", () => {
    const scaledRecipe = baseRecipe.scaleTo(4);
    expect(scaledRecipe.ingredients.length).toBe(4);
    expect(scaledRecipe.ingredients[0]!.quantities).toEqual([
      {
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 200 },
        },
        unit: "g",
      },
    ]);
    expect(scaledRecipe.ingredients[1]!.quantities).toEqual([
      {
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 1 },
        },
        unit: "tsp",
      },
    ]);
    expect(scaledRecipe.ingredients[2]!.quantities).toEqual([
      {
        quantity: {
          type: "range",
          min: { type: "decimal", decimal: 4 },
          max: { type: "decimal", decimal: 6 },
        },
        unit: undefined,
      },
    ]);
    expect(scaledRecipe.ingredients[3]!.quantities).toBeUndefined();
  });

  it("should scale down ingredient quantities", () => {
    const scaledRecipe = baseRecipe.scaleTo(1);
    expect(scaledRecipe.ingredients.length).toBe(4);
    expect(scaledRecipe.ingredients[0]!.quantities).toEqual([
      {
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 50 },
        },
        unit: "g",
      },
    ]);
    expect(scaledRecipe.ingredients[1]!.quantities).toEqual([
      {
        quantity: {
          type: "fixed",
          value: { type: "fraction", num: 1, den: 4 },
        },
        unit: "tsp",
      },
    ]);
    expect(scaledRecipe.ingredients[2]!.quantities).toEqual([
      {
        quantity: {
          type: "range",
          min: { type: "decimal", decimal: 1 },
          max: { type: "decimal", decimal: 1.5 },
        },
        unit: undefined,
      },
    ]);
  });

  it("should update the servings property", () => {
    const scaledRecipe = baseRecipe.scaleTo(4);
    expect(scaledRecipe.servings).toBe(4);
    expect(scaledRecipe.metadata.servings).toBe(4);
    expect(scaledRecipe.metadata.serves).toBe(4);
    expect(scaledRecipe.metadata.yield).toEqual<Yield>({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 4 } },
    });
  });

  it("should update numerical metadata fields", () => {
    const scaledRecipe = baseRecipe.scaleTo(4);
    expect(scaledRecipe.metadata.servings).toBe(4);
    expect(scaledRecipe.metadata.yield).toEqual<Yield>({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 4 } },
    });
  });

  it("should also scale individual quantity parts of referenced ingredients", () => {
    const scaledRecipe = baseRecipe.scaleTo(4);
    const step = scaledRecipe.sections[0]!.content[0] as Step;
    const item1 = step.items[1] as IngredientItem;
    const item3 = step.items[3] as IngredientItem;

    expect(item1.alternatives[0]).toMatchObject({
      unit: { name: "g" },
      quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
    });
    expect(item3.alternatives[0]).toMatchObject({
      unit: { name: "g" },
      quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
    });
  });

  it("should default servings to 1 if no initial servings information", () => {
    const recipeWithoutServings = new Recipe("@water{1%L}");
    const scaledRecipe = recipeWithoutServings.scaleTo(4);
    expect(scaledRecipe.servings).toBe(4);
    const water = scaledRecipe.ingredients[0]!.quantities;
    if (!water) throw new Error("No quantities found for water ingredient");
    expect(water[0]).toEqual({
      quantity: {
        type: "fixed",
        value: { type: "decimal", decimal: 4 },
      },
      unit: "L",
    });
  });

  it("should handle non-numeric servings (text) gracefully", () => {
    const recipe = new Recipe(`---\nservings: two\n---\n@water{1%L}`);
    expect(recipe.metadata.servings).toBe("two");
    expect(recipe.servings).toBe(1);
    const scaled = recipe.scaleTo(4);
    expect(scaled.servings).toBe(4);
    expect(scaled.metadata.servings).toBe("two");
  });

  it("should handle non-numeric yield (text) gracefully", () => {
    const recipe = new Recipe(`---\nyield: some text\n---\n@water{1%L}`);
    expect(recipe.metadata.yield).toEqual({
      quantity: { type: "fixed", value: { type: "text", text: "some text" } },
    });
    expect(recipe.servings).toBe(1);
    const scaled = recipe.scaleTo(4);
    expect(scaled.servings).toBe(4);
    expect(scaled.metadata.yield).toEqual({
      quantity: { type: "fixed", value: { type: "text", text: "some text" } },
    });
  });

  it("should not modify the original recipe", () => {
    const originalRecipe = baseRecipe.clone();
    baseRecipe.scaleTo(4);
    expect(baseRecipe).toEqual(originalRecipe);
  });

  it("should handle numbers with repeating decimals", () => {
    const recipe = new Recipe(`---
servings: 3
---
@eggs{6}`);
    const scaledRecipe = recipe.scaleTo(2);
    expect(scaledRecipe.ingredients[0]!.quantities).toEqual([
      {
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 4 },
        },
        unit: undefined,
      },
    ]);
  });
});

describe("scaleBy", () => {
  const baseRecipe = new Recipe(recipeToScale);

  it("should scale up ingredient quantities", () => {
    const scaledRecipe = baseRecipe.scaleBy(2);
    expect(scaledRecipe.ingredients.length).toBe(4);
    expect(scaledRecipe.ingredients[0]!.quantities).toEqual([
      {
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 200 },
        },
        unit: "g",
      },
    ]);
    expect(scaledRecipe.ingredients[1]!.quantities).toEqual([
      {
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 1 },
        },
        unit: "tsp",
      },
    ]);
    expect(scaledRecipe.ingredients[2]!.quantities).toEqual([
      {
        quantity: {
          type: "range",
          min: { type: "decimal", decimal: 4 },
          max: { type: "decimal", decimal: 6 },
        },
        unit: undefined,
      },
    ]);
    expect(scaledRecipe.ingredients[3]!.quantities).toBeUndefined();
  });

  it("should scale down ingredient quantities", () => {
    const scaledRecipe = baseRecipe.scaleBy(0.5);
    expect(scaledRecipe.ingredients.length).toBe(4);
    expect(scaledRecipe.ingredients[0]!.quantities).toEqual([
      {
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 50 },
        },
        unit: "g",
      },
    ]);
    expect(scaledRecipe.ingredients[1]!.quantities).toEqual([
      {
        quantity: {
          type: "fixed",
          value: { type: "fraction", num: 1, den: 4 },
        },
        unit: "tsp",
      },
    ]);
    expect(scaledRecipe.ingredients[2]!.quantities).toEqual([
      {
        quantity: {
          type: "range",
          min: { type: "decimal", decimal: 1 },
          max: { type: "decimal", decimal: 1.5 },
        },
        unit: undefined,
      },
    ]);
  });

  it("should update the servings property", () => {
    const scaledRecipe = baseRecipe.scaleBy(2);
    expect(scaledRecipe.servings).toBe(4);
    expect(scaledRecipe.metadata.serves).toBe(4);
    expect(scaledRecipe.metadata.servings).toBe(4);
    expect(scaledRecipe.metadata.yield).toEqual<Yield>({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 4 } },
    });
  });

  it("should update numerical metadata fields", () => {
    const scaledRecipe = baseRecipe.scaleBy(2);
    expect(scaledRecipe.metadata.serves).toBe(4);
    expect(scaledRecipe.metadata.yield).toEqual<Yield>({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 4 } },
    });
  });

  it("should default servings to 1 if no initial serving information", () => {
    const recipeWithoutServings = new Recipe("@water{1%L}");
    const scaledRecipe = recipeWithoutServings.scaleBy(2);
    expect(scaledRecipe.servings).toBe(2);
    const water = scaledRecipe.ingredients[0]!.quantities;
    if (!water) throw new Error("No quantities found for water ingredient");
    expect(water[0]).toEqual({
      quantity: {
        type: "fixed",
        value: { type: "decimal", decimal: 2 },
      },
      unit: "L",
    });
  });

  it("should handle non-numeric servings (text) gracefully", () => {
    const recipe = new Recipe(`---\nservings: two\n---\n@water{1%L}`);
    expect(recipe.metadata.servings).toBe("two");
    expect(recipe.servings).toBe(1);
    const scaled = recipe.scaleBy(2);
    expect(scaled.servings).toBe(2);
    expect(scaled.metadata.servings).toBe("two");
  });

  it("should handle non-numeric yield (text) gracefully", () => {
    const recipe = new Recipe(`---\nyield: some text\n---\n@water{1%L}`);
    expect(recipe.metadata.yield).toEqual({
      quantity: { type: "fixed", value: { type: "text", text: "some text" } },
    });
    expect(recipe.servings).toBe(1);
    const scaled = recipe.scaleBy(2);
    expect(scaled.servings).toBe(2);
    expect(scaled.metadata.yield).toEqual({
      quantity: { type: "fixed", value: { type: "text", text: "some text" } },
    });
  });

  it("should not modify the original recipe", () => {
    const originalRecipe = baseRecipe.clone();
    baseRecipe.scaleBy(2);
    expect(baseRecipe).toEqual(originalRecipe);
  });

  it("should scale numeric part of complex scaling metadata", () => {
    const recipe = new Recipe(`
---
servings: 2
yield: 2
serves: 2
---
`);
    const scaledRecipe = recipe.scaleBy(2);
    expect(scaledRecipe.servings).toBe(4);
    expect(scaledRecipe.metadata.servings).toBe(4);
    expect(scaledRecipe.metadata.yield).toEqual<Yield>({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 4 } },
    });
    expect(scaledRecipe.metadata.serves).toBe(4);
  });

  it("should scale alternative ingredients when scaling by", () => {
    const recipe = new Recipe(recipeWithInlineAlternatives);
    const scaledRecipe = recipe.scaleBy(2);
    expect(scaledRecipe.ingredients.length).toBe(3);
    const ingredient0Quantities: (
      | IngredientQuantityGroup
      | IngredientQuantityAndGroup
    )[] = [
      {
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 400 },
        },
        unit: "ml",
        alternatives: [
          [
            {
              index: 1,
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
          [
            {
              index: 2,
              quantities: [
                {
                  quantity: {
                    type: "fixed",
                    value: { type: "decimal", decimal: 300 },
                  },
                  unit: "ml",
                },
              ],
            },
          ],
        ],
      },
    ];
    expect(scaledRecipe.ingredients[0]!.quantities).toEqual(
      ingredient0Quantities,
    );
    const step = scaledRecipe.sections[0]!.content[0] as Step;
    const ingredientItem0: IngredientItem = {
      id: "ingredient-item-0",
      type: "ingredient",
      alternatives: [
        {
          displayName: "milk",
          index: 0,

          scalable: true,
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 400 },
          },
          unit: { name: "ml" },
        },
        {
          displayName: "almond milk",
          index: 1,

          scalable: true,
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 200 },
          },
          unit: { name: "ml" },
          note: "vegan version",
        },
        {
          displayName: "soy milk",
          index: 2,

          scalable: true,
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 300 },
          },
          unit: { name: "ml" },
          note: "another vegan option",
        },
      ],
    };
    expect(step.items[1]).toEqual(ingredientItem0);
  });

  it("should scale alternative units of an ingredient when scaling by", () => {
    const recipe = new Recipe(`---
servings: 2
---
Use @sugar{100%g|0.5%cups|3.5%oz} in the mix.
    `);
    const scaledRecipe = recipe.scaleBy(2);
    expect(scaledRecipe.ingredients.length).toBe(1);
    const ingredient0Quantities: (
      | IngredientQuantityGroup
      | IngredientQuantityAndGroup
    )[] = [
      {
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 200 },
        },
        unit: "g",
        equivalents: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1 },
            },
            unit: "cups",
          },
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 7 },
            },
            unit: "oz",
          },
        ],
      },
    ];
    expect(scaledRecipe.ingredients[0]!.quantities).toEqual(
      ingredient0Quantities,
    );
    const ingredientStep0 = scaledRecipe.sections[0]!.content[0] as Step;
    const ingredientItem0: IngredientItem = {
      id: "ingredient-item-0",
      type: "ingredient",
      alternatives: [
        {
          displayName: "sugar",
          index: 0,

          scalable: true,
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 200 },
          },
          unit: { name: "g" },
          equivalents: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: { name: "cups" },
            },
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 7 },
              },
              unit: { name: "oz" },
            },
          ],
        },
      ],
    };
    expect(ingredientStep0.items[1]).toEqual(ingredientItem0);
  });

  it("should not scale text quantities of equivalents units", () => {
    const recipe = new Recipe(`---
servings: 2
---
Use @sugar{100%g|a cup} in the mix.
    `);
    const scaledRecipe = recipe.scaleBy(2);
    expect(scaledRecipe.ingredients.length).toBe(1);
    const ingredient0Quantities: (
      | IngredientQuantityGroup
      | IngredientQuantityAndGroup
    )[] = [
      {
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 200 },
        },
        unit: "g",
        equivalents: [
          {
            quantity: {
              type: "fixed",
              value: { type: "text", text: "a cup" },
            },
          },
        ],
      },
    ];
    expect(scaledRecipe.ingredients[0]!.quantities).toEqual(
      ingredient0Quantities,
    );
  });

  it("should not scale fixed quantities", () => {
    const recipe = new Recipe(recipeToScaleSomeFixedQuantities);
    const scaledRecipe = recipe.scaleBy(2);
    expect(scaledRecipe.ingredients[0]!.quantities).toEqual([
      {
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 100 },
        },
        unit: "g",
      },
    ]);
    expect(scaledRecipe.ingredients[1]!.quantities).toEqual([
      {
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 10 },
        },
        unit: "g",
      },
    ]);
  });

  it("should scale choices when scaling by", () => {
    const recipe = new Recipe(`
---
servings: 2
---
Use @sugar{100%g}|honey{100%g} in the mix.

Add @|milk|milk{150%mL} or @|milk|oat milk{150%mL} for a vegan version.
    `);
    const scaledRecipe = recipe.scaleBy(2);
    const sugarIngredientChoice =
      scaledRecipe.choices.ingredientItems.get("ingredient-item-0");
    expect(sugarIngredientChoice).toEqual([
      {
        displayName: "sugar",
        index: 0,

        quantity: {
          type: "fixed",
          value: {
            decimal: 200,
            type: "decimal",
          },
        },
        unit: {
          name: "g",
        },
        scalable: true,
      },
      {
        displayName: "honey",
        index: 1,

        quantity: {
          type: "fixed",
          value: {
            decimal: 200,
            type: "decimal",
          },
        },
        unit: {
          name: "g",
        },
        scalable: true,
      },
    ]);

    const milkIngredientChoice =
      scaledRecipe.choices.ingredientGroups.get("milk");
    expect(milkIngredientChoice).toEqual([
      [
        {
          displayName: "milk",
          index: 2,
          itemId: "ingredient-item-1",

          quantity: {
            type: "fixed",
            value: {
              decimal: 300,
              type: "decimal",
            },
          },
          unit: {
            name: "mL",
          },
          scalable: true,
        },
      ],
      [
        {
          displayName: "oat milk",
          index: 3,
          itemId: "ingredient-item-2",

          quantity: {
            type: "fixed",
            value: {
              decimal: 300,
              type: "decimal",
            },
          },
          unit: {
            name: "mL",
          },
          scalable: true,
        },
      ],
    ]);
  });

  it("should scale arbitraries when scaling by", () => {
    const recipe = new Recipe(`
---
servings: 2
---
Add {{sauce:100%g}} of sauce.
    `);
    const scaledRecipe = recipe.scaleBy(2);
    expect(scaledRecipe.arbitraries.length).toBe(1);
    expect(scaledRecipe.arbitraries[0]!).toEqual({
      name: "sauce",
      quantity: {
        type: "fixed",
        value: { type: "decimal", decimal: 200 },
      },
      unit: "g",
    });
  });

  it("should apply best unit to arbitraries when scaling", () => {
    const recipe = new Recipe(`
---
servings: 1
unit system: metric
---
Add {{sauce:100%g}} of sauce.
    `);
    // Scale by 10x - 100g * 10 = 1000g = 1kg
    const scaledRecipe = recipe.scaleBy(10);
    expect(scaledRecipe.arbitraries[0]!).toEqual({
      name: "sauce",
      quantity: {
        type: "fixed",
        value: { type: "decimal", decimal: 1 },
      },
      unit: "kg",
    });
  });
});

describe("scaleBy with best unit optimization", () => {
  it("should scale yield with unit using complex format", () => {
    const recipe = new Recipe(recipeWithUnitServings);
    expect(recipe.servings).toBe(300);
    expect(recipe.metadata.yield).toEqual<Yield>({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 300 } },
      unit: "g",
      textAfter: "of bread",
    });

    // Scale by 4x: 300g * 4 = 1200g → 1.2kg (best unit)
    const scaledRecipe = recipe.scaleBy(4);
    expect(scaledRecipe.metadata.yield).toEqual<Yield>({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1.2 } },
      unit: "kg",
      textAfter: "of bread",
    });
  });

  it("should scale yield with unit and prefix using complex format", () => {
    const recipe = new Recipe(`
---
yield: about {{300%g}}
---
Mix @flour{200%g}
    `);

    const scaledRecipe = recipe.scaleBy(4);
    expect(scaledRecipe.metadata.yield).toEqual<Yield>({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1.2 } },
      unit: "kg",
      textBefore: "about",
    });
  });

  it("should apply best unit when scaling with unitSystem set (metric)", () => {
    const recipe = new Recipe(`
---
servings: 1
unit system: metric
---
Add @flour{100%g}.
    `);

    // Scale by 10x - 100g * 10 = 1000g = 1kg
    const scaledRecipe = recipe.scaleBy(10);
    const step = scaledRecipe.sections[0]!.content[0]! as Step;
    const item = step.items.find(
      (i) => i.type === "ingredient",
    ) as IngredientItem;
    expect(item.alternatives[0]).toMatchObject({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
      unit: { name: "kg" },
    });
  });

  it("should apply best unit to equivalents when scaling", () => {
    const recipe = new Recipe(`
---
servings: 1
unit system: metric
---
Add @flour{100%g|1%cup}.
    `);

    // Scale by 10x - 100g * 10 = 1000g = 1kg, 1cup * 10 = 10 cups stays (no better unit)
    const scaledRecipe = recipe.scaleBy(10);
    const step = scaledRecipe.sections[0]!.content[0]! as Step;
    const item = step.items.find(
      (i) => i.type === "ingredient",
    ) as IngredientItem;
    expect(item.alternatives[0]).toMatchObject({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
      unit: { name: "kg" },
    });
    // Equivalent (cup) optimized within metric system context
    expect(item.alternatives[0]!.equivalents![0]).toMatchObject({
      quantity: { type: "fixed", value: { type: "decimal" } },
      unit: { name: "l" },
    });
  });

  it("should apply best unit even when unitSystem is not set (infers from unit)", () => {
    const recipe = new Recipe(`
---
servings: 1
---
Add @flour{100%g}.
    `);

    // Scale by 10x - 100g * 10 = 1000g = 1kg (infers metric system from g unit)
    const scaledRecipe = recipe.scaleBy(10);
    const step = scaledRecipe.sections[0]!.content[0]! as Step;
    const item = step.items.find(
      (i) => i.type === "ingredient",
    ) as IngredientItem;
    expect(item.alternatives[0]).toMatchObject({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
      unit: { name: "kg" },
    });
  });

  it("should apply best unit to range quantities", () => {
    const recipe = new Recipe(`
---
servings: 1
unit system: metric
---
Add @flour{100-200%g}.
    `);

    // Scale by 10x - range becomes 1000-2000g = 1-2kg
    const scaledRecipe = recipe.scaleBy(10);
    const step = scaledRecipe.sections[0]!.content[0]! as Step;
    const item = step.items.find(
      (i) => i.type === "ingredient",
    ) as IngredientItem;
    expect(item.alternatives[0]).toMatchObject({
      quantity: {
        type: "range",
        min: { type: "decimal", decimal: 1 },
        max: { type: "decimal", decimal: 2 },
      },
      unit: { name: "kg" },
    });
  });

  it("should leave text quantities unchanged", () => {
    const recipe = new Recipe(`
---
servings: 1
unit system: metric
---
Add @flour{some%g}.
    `);

    const scaledRecipe = recipe.scaleBy(2);
    const step = scaledRecipe.sections[0]!.content[0]! as Step;
    const item = step.items.find(
      (i) => i.type === "ingredient",
    ) as IngredientItem;
    expect(item.alternatives[0]).toMatchObject({
      quantity: { type: "fixed", value: { type: "text", text: "some" } },
      unit: { name: "g" },
    });
  });

  it("should leave non-convertible units unchanged", () => {
    const recipe = new Recipe(`
---
servings: 1
unit system: metric
---
Add @eggs{5%piece}.
    `);

    const scaledRecipe = recipe.scaleBy(2);
    const step = scaledRecipe.sections[0]!.content[0]! as Step;
    const item = step.items.find(
      (i) => i.type === "ingredient",
    ) as IngredientItem;
    expect(item.alternatives[0]).toMatchObject({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 10 } },
      unit: { name: "piece" },
    });
  });

  it("should keep 1/2 cup after round-trip scale ×2 then ×0.5 (not convert to 4 fl-oz)", () => {
    // @cream{1/2%cup} → ×2 = 1 cup ✓ → ×0.5 should return to 1/2 cup, NOT 4 fl-oz
    const recipe = new Recipe(`
---
servings: 1
---
Add @cream{1/2%cup}.
    `);
    const step = (r: Recipe) =>
      (r.sections[0]!.content[0]! as Step).items.find(
        (i) => i.type === "ingredient",
      ) as IngredientItem;

    const doubled = recipe.scaleBy(2);
    expect(step(doubled).alternatives[0]).toMatchObject({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
      unit: { name: "cup" },
    });

    const roundTrip = doubled.scaleBy(0.5);
    // 0.5 cup is an allowed fraction (1/2), so it's returned as FractionValue
    expect(step(roundTrip).alternatives[0]).toMatchObject({
      quantity: { type: "fixed", value: { type: "fraction", num: 1, den: 2 } },
      unit: { name: "cup" },
    });
  });

  it("should keep 1/2 lb after round-trip scale ×2 then ×0.5 (not convert to 8 oz)", () => {
    const recipe = new Recipe(`
---
servings: 1
---
Add @butter{1/2%lb}.
    `);
    const step = (r: Recipe) =>
      (r.sections[0]!.content[0]! as Step).items.find(
        (i) => i.type === "ingredient",
      ) as IngredientItem;

    const doubled = recipe.scaleBy(2);
    expect(step(doubled).alternatives[0]).toMatchObject({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
      unit: { name: "lb" },
    });

    const roundTrip = doubled.scaleBy(0.5);
    // 0.5 lb is an allowed fraction (1/2), so it's returned as FractionValue
    expect(step(roundTrip).alternatives[0]).toMatchObject({
      quantity: { type: "fixed", value: { type: "fraction", num: 1, den: 2 } },
      unit: { name: "lb" },
    });
  });

  it("should keep 1.5 cups as cups rather than converting to 12 fl-oz", () => {
    // 1 cup × 1.5 = 1.5 cups: non-integer in input family should beat integer in another family
    const recipe = new Recipe(`
---
servings: 2
---
Add @cream{1%cup}.
    `);
    const step = (r: Recipe) =>
      (r.sections[0]!.content[0]! as Step).items.find(
        (i) => i.type === "ingredient",
      ) as IngredientItem;

    const scaled = recipe.scaleTo(3); // 1 cup for 2 servings → 1.5 cups for 3 servings
    // 1.5 cup = 3/2, which is an allowed fraction of cup, so it's returned as FractionValue
    expect(step(scaled).alternatives[0]).toMatchObject({
      quantity: { type: "fixed", value: { type: "fraction", num: 3, den: 2 } },
      unit: { name: "cup" },
    });
  });
});

describe("scaleBy equivalent deduplication", () => {
  const step = (r: Recipe) =>
    (r.sections[0]!.content[0]! as Step).items.find(
      (i) => i.type === "ingredient",
    ) as IngredientItem;

  it("should drop equivalent that becomes identical to primary after unit upgrade (fl-oz → cup)", () => {
    // 8 fl-oz and 1 cup are the same amount. Scaled ×2:
    //   8 fl-oz → 16 fl-oz > maxValue(15) → best unit = 2 cup (primary)
    //   1 cup   → 2 cup (equivalent)
    // After optimization both are "2 cup" → equivalent is dropped.
    const recipe = new Recipe(`
---
servings: 1
---
Add @cream{8%fl-oz|1%cup}.
    `);
    const scaled = recipe.scaleBy(2);
    const alt = step(scaled).alternatives[0]!;
    expect(alt).toMatchObject({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
      unit: { name: "cup" },
    });
    expect(alt.equivalents).toBeUndefined();
  });

  it("should drop equivalent that becomes identical to primary after unit upgrade (oz → lb)", () => {
    // 16 oz and 1 lb are the same. Scaled ×2:
    //   16 oz → 32 oz > maxValue(31) → best unit = 2 lb (primary)
    //   1 lb  → 2 lb (equivalent)
    // Both are "2 lb" → equivalent is dropped.
    const recipe = new Recipe(`
---
servings: 1
---
Add @butter{16%oz|1%lb}.
    `);
    const scaled = recipe.scaleBy(2);
    const alt = step(scaled).alternatives[0]!;
    expect(alt).toMatchObject({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
      unit: { name: "lb" },
    });
    expect(alt.equivalents).toBeUndefined();
  });

  it("should keep equivalent when same unit but different value (inconsistent input)", () => {
    // 4 fl-oz (half a cup) paired with 1 cup gives contradictory amounts — kept as-is.
    // Scaled ×2: 4 fl-oz → 8 fl-oz (in range, stays fl-oz); 1 cup → 2 cup
    // Different values → not deduplicated.
    const recipe = new Recipe(`
---
servings: 1
---
Add @cream{4%fl-oz|1%cup}.
    `);
    const scaled = recipe.scaleBy(2);
    const alt = step(scaled).alternatives[0]!;
    expect(alt).toMatchObject({ unit: { name: "fl-oz" } });
    expect(alt.equivalents).toHaveLength(1);
    expect(alt.equivalents![0]).toMatchObject({ unit: { name: "cup" } });
  });

  it("should keep numeric equivalent when primary has a text value", () => {
    // Primary "to taste" is a text quantity → primaryValue = null → seen stays empty.
    // Equivalent 5g scaled ×2 = 10g is kept (nothing in seen to match against).
    const recipe = new Recipe(`
---
servings: 1
---
Add @salt{to taste|5%g}.
    `);
    const scaled = recipe.scaleBy(2);
    const alt = step(scaled).alternatives[0]!;
    expect(alt).toMatchObject<Partial<IngredientAlternative>>({
      quantity: { type: "fixed", value: { type: "text", text: "to taste" } },
    });
    expect(alt.equivalents).toHaveLength(1);
    expect(alt.equivalents![0]).toMatchObject<QuantityWithExtendedUnit>({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 10 } },
      unit: { name: "g" },
    });
  });

  it("should keep text-value equivalent that has a unit", () => {
    // Equivalent "a pinch%ml" has a known unit but a text value → value = null → kept.
    // Scaled ×2: primary 1 cup → 2 cup; equivalent "a pinch" stays unchanged.
    const recipe = new Recipe(`
---
servings: 1
---
Add @cream{1%cup|a pinch%ml}.
    `);
    const scaled = recipe.scaleBy(2);
    const alt = step(scaled).alternatives[0]!;
    expect(alt).toMatchObject({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
      unit: { name: "cup" },
    });
    expect(alt.equivalents).toHaveLength(1);
    expect(alt.equivalents![0]).toMatchObject<QuantityWithExtendedUnit>({
      quantity: { type: "fixed", value: { type: "text", text: "a pinch" } },
      unit: { name: "ml" },
    });
  });
});
