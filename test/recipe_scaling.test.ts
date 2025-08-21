import { describe, it, expect } from "vitest";
import { Recipe } from "../src/classes/recipe";

describe("scaleTo", () => {
  const baseRecipe = new Recipe();
  baseRecipe.metadata = {
    servings: "2",
    yield: "2",
    serves: "2",
  };
  baseRecipe.ingredients = [
    { name: "flour", quantity: 100, unit: "g" },
    { name: "sugar", quantity: 50, unit: "g" },
    { name: "eggs", quantity: 2 },
    { name: "milk" },
  ];
  baseRecipe.cookware = [];
  baseRecipe.timers = [];
  baseRecipe.sections = [];
  baseRecipe.servings = 2;

  it("should scale up ingredient quantities", () => {
    const scaledRecipe = baseRecipe.scaleTo(4);
    expect(scaledRecipe.ingredients.length).toBe(4);
    expect(scaledRecipe.ingredients[0]!.quantity).toBe(200);
    expect(scaledRecipe.ingredients[1]!.quantity).toBe(100);
    expect(scaledRecipe.ingredients[2]!.quantity).toBe(4);
    expect(scaledRecipe.ingredients[3]!.quantity).toBeUndefined();
  });

  it("should scale down ingredient quantities", () => {
    const scaledRecipe = baseRecipe.scaleTo(1);
    expect(scaledRecipe.ingredients.length).toBe(4);
    expect(scaledRecipe.ingredients[0]!.quantity).toBe(50);
    expect(scaledRecipe.ingredients[1]!.quantity).toBe(25);
    expect(scaledRecipe.ingredients[2]!.quantity).toBe(1);
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
    recipeWithoutServings.metadata = {};
    recipeWithoutServings.ingredients = [
      { name: "water", quantity: 1, unit: "l" },
    ];
    recipeWithoutServings.cookware = [];
    recipeWithoutServings.timers = [];
    recipeWithoutServings.sections = [];

    expect(() => recipeWithoutServings.scaleTo(4)).toThrowError(
      "Error scaling recipe: no initial servings value set",
    );
  });

  it("should not modify the original recipe", () => {
    const originalRecipe = baseRecipe.clone();
    baseRecipe.scaleTo(4);
    expect(baseRecipe).toEqual(originalRecipe);
  });

  it("should handle non-numeric metadata", () => {
    const recipeWithNonNumericMeta = new Recipe();
    recipeWithNonNumericMeta.metadata = {
      servings: "a few",
    };
    recipeWithNonNumericMeta.ingredients = [
      { name: "water", quantity: 1, unit: "l" },
    ];
    recipeWithNonNumericMeta.cookware = [];
    recipeWithNonNumericMeta.timers = [];
    recipeWithNonNumericMeta.sections = [];
    recipeWithNonNumericMeta.servings = 2;

    const scaledRecipe = recipeWithNonNumericMeta.scaleTo(4);
    expect(scaledRecipe.ingredients.length).toBe(1);
    expect(scaledRecipe.ingredients[0]!.quantity).toBe(2);
    expect(scaledRecipe.servings).toBe(4);
    expect(scaledRecipe.metadata.servings).toBe("a few");
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
    { name: "flour", quantity: 100, unit: "g" },
    { name: "sugar", quantity: 50, unit: "g" },
    { name: "eggs", quantity: 2 },
    { name: "milk" },
  ];
  baseRecipe.cookware = [];
  baseRecipe.timers = [];
  baseRecipe.sections = [];
  baseRecipe.servings = 2;

  it("should scale up ingredient quantities", () => {
    const scaledRecipe = baseRecipe.scaleBy(2);
    expect(scaledRecipe.ingredients.length).toBe(4);
    expect(scaledRecipe.ingredients[0]!.quantity).toBe(200);
    expect(scaledRecipe.ingredients[1]!.quantity).toBe(100);
    expect(scaledRecipe.ingredients[2]!.quantity).toBe(4);
    expect(scaledRecipe.ingredients[3]!.quantity).toBeUndefined();
  });

  it("should scale down ingredient quantities", () => {
    const scaledRecipe = baseRecipe.scaleBy(0.5);
    expect(scaledRecipe.ingredients.length).toBe(4);
    expect(scaledRecipe.ingredients[0]!.quantity).toBe(50);
    expect(scaledRecipe.ingredients[1]!.quantity).toBe(25);
    expect(scaledRecipe.ingredients[2]!.quantity).toBe(1);
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
      { name: "water", quantity: 1, unit: "l" },
    ];
    recipeWithoutServings.cookware = [];
    recipeWithoutServings.timers = [];
    recipeWithoutServings.sections = [];

    expect(() => recipeWithoutServings.scaleBy(2)).toThrowError(
      "Error scaling recipe: no initial servings value set",
    );
  });

  it("should not modify the original recipe", () => {
    const originalRecipe = baseRecipe.clone();
    baseRecipe.scaleBy(2);
    expect(baseRecipe).toEqual(originalRecipe);
  });

  it("should handle non-numeric metadata", () => {
    const recipeWithNonNumericMeta = new Recipe();
    recipeWithNonNumericMeta.metadata = {
      servings: "a few",
    };
    recipeWithNonNumericMeta.ingredients = [
      { name: "water", quantity: 1, unit: "l" },
    ];
    recipeWithNonNumericMeta.cookware = [];
    recipeWithNonNumericMeta.timers = [];
    recipeWithNonNumericMeta.sections = [];
    recipeWithNonNumericMeta.servings = 2;

    const scaledRecipe = recipeWithNonNumericMeta.scaleBy(2);
    expect(scaledRecipe.ingredients.length).toBe(1);
    expect(scaledRecipe.ingredients[0]!.quantity).toBe(2);
    expect(scaledRecipe.servings).toBe(4);
    expect(scaledRecipe.metadata.servings).toBe("a few");
  });
});
