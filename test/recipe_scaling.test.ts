import { describe, it, expect } from "vitest";
import type {
  IngredientItem,
  IngredientQuantityGroup,
  IngredientQuantityAndGroup,
  Step,
} from "../src/types";
import { Recipe } from "../src/classes/recipe";
import {
  recipeToScale,
  recipeToScaleSomeFixedQuantities,
  recipeWithInlineAlternatives,
} from "./fixtures/recipes";
import { recipeWithComplexServings } from "./fixtures/recipes";

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
    expect(scaledRecipe.metadata.servings).toBe("4");
    expect(scaledRecipe.metadata.serves).toBe("4");
    expect(scaledRecipe.metadata.yield).toBe("4");
  });

  it("should update numerical metadata fields", () => {
    const scaledRecipe = baseRecipe.scaleTo(4);
    expect(scaledRecipe.metadata.servings).toBe("4");
    expect(scaledRecipe.metadata.yield).toBe("4");
  });

  it("should also scale individual quantity parts of referenced ingredients", () => {
    const scaledRecipe = baseRecipe.scaleTo(4);
    const step = scaledRecipe.sections[0]!.content[0] as Step;
    const item1 = step.items[1] as IngredientItem;
    const item3 = step.items[3] as IngredientItem;

    expect(item1.alternatives[0]?.itemQuantity).toMatchObject({
      unit: { name: "g" },
      quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
    });
    expect(item3.alternatives[0]?.itemQuantity).toMatchObject({
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

  it("should not modify the original recipe", () => {
    const originalRecipe = baseRecipe.clone();
    baseRecipe.scaleTo(4);
    expect(baseRecipe).toEqual(originalRecipe);
  });

  it("should handle complex scaling metadata", () => {
    const recipeWithNonNumericMeta = new Recipe(recipeWithComplexServings);

    const scaledRecipe = recipeWithNonNumericMeta.scaleTo(4);
    expect(scaledRecipe.ingredients.length).toBe(1);
    expect(scaledRecipe.ingredients[0]!.quantities).toEqual([
      {
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 2 },
        },
        unit: "L",
      },
    ]);
    expect(scaledRecipe.servings).toBe(4);
    expect(scaledRecipe.metadata.servings).toBe("2, a few");
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
    expect(scaledRecipe.metadata.serves).toBe("4");
    expect(scaledRecipe.metadata.servings).toBe("4");
    expect(scaledRecipe.metadata.yield).toBe("4");
  });

  it("should update numerical metadata fields", () => {
    const scaledRecipe = baseRecipe.scaleBy(2);
    expect(scaledRecipe.metadata.serves).toBe("4");
    expect(scaledRecipe.metadata.yield).toBe("4");
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

  it("should not modify the original recipe", () => {
    const originalRecipe = baseRecipe.clone();
    baseRecipe.scaleBy(2);
    expect(baseRecipe).toEqual(originalRecipe);
  });

  it("should scale complex metadata", () => {
    const recipeWithNonNumericMeta = new Recipe(recipeWithComplexServings);

    const scaledRecipe = recipeWithNonNumericMeta.scaleBy(2);
    expect(scaledRecipe.ingredients.length).toBe(1);
    expect(scaledRecipe.ingredients[0]!.quantities).toEqual([
      {
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 2 },
        },
        unit: "L",
      },
    ]);
    expect(scaledRecipe.servings).toBe(4);
    expect(scaledRecipe.metadata.servings).toBe("2, a few");
  });

  it("should not scale non numeric scaling metadata", () => {
    const recipe = new Recipe(`
---
servings: 2, some
yield: 2, some
serves: 2, some
---
`);
    const scaledRecipe = recipe.scaleBy(2);
    expect(scaledRecipe.servings).toBe(4);
    expect(scaledRecipe.metadata.servings).toBe("2, some");
    expect(scaledRecipe.metadata.yield).toBe("2, some");
    expect(scaledRecipe.metadata.serves).toBe("2, some");
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
          itemQuantity: {
            scalable: true,
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 400 },
            },
            unit: { name: "ml" },
          },
        },
        {
          displayName: "almond milk",
          index: 1,
          itemQuantity: {
            scalable: true,
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 200 },
            },
            unit: { name: "ml" },
          },
          note: "vegan version",
        },
        {
          displayName: "soy milk",
          index: 2,
          itemQuantity: {
            scalable: true,
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 300 },
            },
            unit: { name: "ml" },
          },
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
          itemQuantity: {
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
        itemQuantity: {
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
      },
      {
        displayName: "honey",
        index: 1,
        itemQuantity: {
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
      },
    ]);

    const milkIngredientChoice =
      scaledRecipe.choices.ingredientGroups.get("milk");
    expect(milkIngredientChoice).toEqual([
      {
        displayName: "milk",
        index: 2,
        itemId: "ingredient-item-1",
        itemQuantity: {
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
      },
      {
        displayName: "oat milk",
        index: 3,
        itemId: "ingredient-item-2",
        itemQuantity: {
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
      },
    ]);
  });
});
