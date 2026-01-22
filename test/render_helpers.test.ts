import { describe, it, expect } from "vitest";

import { isAlternativeSelected } from "../src/utils/render_helpers";
import { Recipe } from "../src/classes/recipe";
import type { IngredientItem, RecipeChoices, Step } from "../src/types";
import {
  recipeWithInlineAlternatives,
  recipeWithGroupedAlternatives,
} from "./fixtures/recipes";

describe("isAlternativeSelected", () => {
  it("should return the correct value for selected inline alternative", () => {
    const recipe = new Recipe(recipeWithInlineAlternatives);
    const choicesInline: RecipeChoices = {
      ingredientItems: new Map([
        ["ingredient-item-0", 1], // Select 2nd alternative for ing-alt-1
      ]),
    };
    const step = recipe.sections[0]!.content[0] as Step;
    const item = step.items.find(
      (i) => i.type === "ingredient" && i.id === "ingredient-item-0",
    ) as IngredientItem;
    expect(isAlternativeSelected(recipe, choicesInline, item, 0)).toBe(false);
    expect(isAlternativeSelected(recipe, choicesInline, item, 1)).toBe(true);
    expect(isAlternativeSelected(recipe, {}, item, 0)).toBe(false);
    expect(isAlternativeSelected(recipe, {}, item, 1)).toBe(false);
  });

  it("should return the correct value for selected grouped alternative", () => {
    const recipe = new Recipe(recipeWithGroupedAlternatives);
    const choicesGrouped: RecipeChoices = {
      ingredientGroups: new Map([
        ["milk", 1], // Select 1st alternative in group-1
      ]),
    };
    const step = recipe.sections[0]!.content[0] as Step;
    const item0 = step.items.find(
      (i) => i.type === "ingredient" && i.id === "ingredient-item-0",
    ) as IngredientItem;
    const item1 = step.items.find(
      (i) => i.type === "ingredient" && i.id === "ingredient-item-1",
    ) as IngredientItem;
    expect(isAlternativeSelected(recipe, choicesGrouped, item0)).toBe(false);
    expect(isAlternativeSelected(recipe, choicesGrouped, item1)).toBe(true);
    expect(isAlternativeSelected(recipe, {}, item0)).toBe(false);
    expect(isAlternativeSelected(recipe, {}, item1)).toBe(false);
  });
});
