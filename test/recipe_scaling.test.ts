import { describe, it, expect } from "vitest";
import { Recipe } from "../src/classes/recipe";
import {
  recipeToScale,
  recipeToScaleSomeFixedQuantities,
} from "./fixtures/recipes";
import { recipeWithComplexServings } from "./fixtures/recipes";

describe("scaleTo", () => {
  const baseRecipe = new Recipe(recipeToScale);

  it("should scale up ingredient quantities", () => {
    const scaledRecipe = baseRecipe.scaleTo(4);
    expect(scaledRecipe.ingredients.length).toBe(4);
    expect(scaledRecipe.ingredients[0]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 200 },
    });
    expect(scaledRecipe.ingredients[1]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 1 },
    });
    expect(scaledRecipe.ingredients[2]!.quantity).toEqual({
      type: "range",
      min: { type: "decimal", value: 4 },
      max: { type: "decimal", value: 6 },
    });
    expect(scaledRecipe.ingredients[3]!.quantity).toBeUndefined();
  });

  it("should scale down ingredient quantities", () => {
    const scaledRecipe = baseRecipe.scaleTo(1);
    expect(scaledRecipe.ingredients.length).toBe(4);
    expect(scaledRecipe.ingredients[0]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 50 },
    });
    expect(scaledRecipe.ingredients[1]!.quantity).toEqual({
      type: "fixed",
      value: { type: "fraction", num: 1, den: 4 },
    });
    expect(scaledRecipe.ingredients[2]!.quantity).toEqual({
      type: "range",
      min: { type: "decimal", value: 1 },
      max: { type: "decimal", value: 1.5 },
    });
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
    expect(scaledRecipe.ingredients[0]!.quantityParts).toEqual([
      {
        unit: "g",
        value: { type: "fixed", value: { type: "decimal", value: 100 } },
        scalable: true,
      },
      {
        unit: "g",
        value: { type: "fixed", value: { type: "decimal", value: 100 } },
        scalable: true,
      },
    ]);
  });

  it("should default servings to 1 if no initial servings information", () => {
    const recipeWithoutServings = new Recipe("@water{1%L}");
    const scaledRecipe = recipeWithoutServings.scaleTo(4);
    expect(scaledRecipe.servings).toBe(4);
    expect(scaledRecipe.ingredients[0]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 4 },
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
    expect(scaledRecipe.ingredients[0]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 2 },
    });
    expect(scaledRecipe.servings).toBe(4);
    expect(scaledRecipe.metadata.servings).toBe("2, a few");
  });

  it("should handle numbers with repeating decimals", () => {
    const recipe = new Recipe(`---
servings: 3
---
@eggs{6}`);
    const scaledRecipe = recipe.scaleTo(2);
    expect(scaledRecipe.ingredients[0]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 4 },
    });
  });
});

describe("scaleBy", () => {
  const baseRecipe = new Recipe(recipeToScale);

  it("should scale up ingredient quantities", () => {
    const scaledRecipe = baseRecipe.scaleBy(2);
    expect(scaledRecipe.ingredients.length).toBe(4);
    expect(scaledRecipe.ingredients[0]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 200 },
    });
    expect(scaledRecipe.ingredients[1]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 1 },
    });
    expect(scaledRecipe.ingredients[2]!.quantity).toEqual({
      type: "range",
      min: { type: "decimal", value: 4 },
      max: { type: "decimal", value: 6 },
    });
    expect(scaledRecipe.ingredients[3]!.quantity).toBeUndefined();
  });

  it("should scale down ingredient quantities", () => {
    const scaledRecipe = baseRecipe.scaleBy(0.5);
    expect(scaledRecipe.ingredients.length).toBe(4);
    expect(scaledRecipe.ingredients[0]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 50 },
    });
    expect(scaledRecipe.ingredients[1]!.quantity).toEqual({
      type: "fixed",
      value: { type: "fraction", num: 1, den: 4 },
    });
    expect(scaledRecipe.ingredients[2]!.quantity).toEqual({
      type: "range",
      min: { type: "decimal", value: 1 },
      max: { type: "decimal", value: 1.5 },
    });
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
    expect(scaledRecipe.ingredients[0]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 2 },
    });
    expect(scaledRecipe.servings).toBe(2);
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
    expect(scaledRecipe.ingredients[0]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 2 },
    });
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

  it("should not scale fixed quantities", () => {
    const recipe = new Recipe(recipeToScaleSomeFixedQuantities);
    const scaledRecipe = recipe.scaleBy(2);
    expect(scaledRecipe.ingredients[0]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 100 },
    });
    expect(scaledRecipe.ingredients[1]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 10 },
    });
  });
});
