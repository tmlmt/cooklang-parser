import { describe, it, expect } from "vitest";
import { Recipe } from "../src/classes/recipe";
import { recipeWithComplexServings } from "./fixtures/recipes";

describe("scaleTo", () => {
  const baseRecipe = new Recipe();
  baseRecipe.metadata = {
    servings: "2",
    yield: "2",
    serves: "2",
  };
  baseRecipe.ingredients = [
    {
      name: "flour",
      quantity: { type: "fixed", value: { type: "decimal", value: 100 } },
      unit: "g",
    },
    {
      name: "sugar",
      quantity: { type: "fixed", value: { type: "fraction", num: 1, den: 2 } },
      unit: "tsp",
    },
    {
      name: "eggs",
      quantity: {
        type: "range",
        min: { type: "decimal", value: 2 },
        max: { type: "decimal", value: 3 },
      },
    },
    { name: "milk" },
  ];
  baseRecipe.servings = 2;

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

  it("should throw an error if no initial servings information", () => {
    const recipeWithoutServings = new Recipe();
    recipeWithoutServings.ingredients = [
      {
        name: "water",
        quantity: { type: "fixed", value: { type: "decimal", value: 1 } },
        unit: "l",
      },
    ];

    expect(() => recipeWithoutServings.scaleTo(4)).toThrowError(
      "Error scaling recipe: no initial servings value set",
    );
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
    expect(scaledRecipe.metadata.servings).toBe("4");
  });
});

describe("scaleBy", () => {
  const baseRecipe = new Recipe();
  baseRecipe.metadata = {
    serves: "2",
    servings: "2",
    yield: "2",
  };
  baseRecipe.ingredients = [
    {
      name: "flour",
      quantity: { type: "fixed", value: { type: "decimal", value: 100 } },
      unit: "g",
    },
    {
      name: "sugar",
      quantity: { type: "fixed", value: { type: "fraction", num: 1, den: 2 } },
      unit: "tsp",
    },
    {
      name: "eggs",
      quantity: {
        type: "range",
        min: { type: "decimal", value: 2 },
        max: { type: "decimal", value: 3 },
      },
    },
    { name: "milk" },
  ];
  baseRecipe.servings = 2;

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

  it("should throw an error if no initial serving information", () => {
    const recipeWithoutServings = new Recipe();
    recipeWithoutServings.metadata = {};
    recipeWithoutServings.ingredients = [
      {
        name: "water",
        quantity: { type: "fixed", value: { type: "decimal", value: 1 } },
        unit: "l",
      },
    ];

    expect(() => recipeWithoutServings.scaleBy(2)).toThrowError(
      "Error scaling recipe: no initial servings value set",
    );
  });

  it("should not modify the original recipe", () => {
    const originalRecipe = baseRecipe.clone();
    baseRecipe.scaleBy(2);
    expect(baseRecipe).toEqual(originalRecipe);
  });

  it("should handle complex scaling metadata", () => {
    const recipeWithNonNumericMeta = new Recipe(recipeWithComplexServings);

    const scaledRecipe = recipeWithNonNumericMeta.scaleBy(2);
    expect(scaledRecipe.ingredients.length).toBe(1);
    expect(scaledRecipe.ingredients[0]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 2 },
    });
    expect(scaledRecipe.servings).toBe(4);
    expect(scaledRecipe.metadata.servings).toBe("4");
  });
});
