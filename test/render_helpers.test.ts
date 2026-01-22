import { describe, it, expect } from "vitest";

import {
  formatNumericValue,
  formatSingleValue,
  formatQuantity,
  formatUnit,
  formatQuantityWithUnit,
  formatExtendedQuantity,
  formatItemQuantity,
  isGroupedItem,
  isAlternativeSelected,
} from "../src/utils/render_helpers";
import { Recipe } from "../src/classes/recipe";
import type {
  IngredientItem,
  RecipeChoices,
  Step,
  DecimalValue,
  FractionValue,
  TextValue,
  FixedValue,
  Range,
  Unit,
  QuantityWithExtendedUnit,
  IngredientItemQuantity,
} from "../src/types";
import {
  recipeWithInlineAlternatives,
  recipeWithGroupedAlternatives,
} from "./fixtures/recipes";

// ============================================================================
// formatNumericValue
// ============================================================================

describe("formatNumericValue", () => {
  it("should format decimal values", () => {
    const decimal: DecimalValue = { type: "decimal", decimal: 1.5 };
    expect(formatNumericValue(decimal)).toBe("1.5");
  });

  it("should format fraction values", () => {
    const fraction: FractionValue = { type: "fraction", num: 1, den: 2 };
    expect(formatNumericValue(fraction)).toBe("1/2");
  });
});

// ============================================================================
// formatSingleValue
// ============================================================================

describe("formatSingleValue", () => {
  it("should format text values", () => {
    const text: TextValue = { type: "text", text: "a pinch" };
    expect(formatSingleValue(text)).toBe("a pinch");
  });

  it("should format decimal values", () => {
    const decimal: DecimalValue = { type: "decimal", decimal: 2 };
    expect(formatSingleValue(decimal)).toBe("2");
  });

  it("should format fraction values", () => {
    const fraction: FractionValue = { type: "fraction", num: 3, den: 4 };
    expect(formatSingleValue(fraction)).toBe("3/4");
  });
});

// ============================================================================
// formatQuantity
// ============================================================================

describe("formatQuantity", () => {
  it("should format fixed decimal quantities", () => {
    const fixed: FixedValue = {
      type: "fixed",
      value: { type: "decimal", decimal: 100 },
    };
    expect(formatQuantity(fixed)).toBe("100");
  });

  it("should format fixed text quantities", () => {
    const fixed: FixedValue = {
      type: "fixed",
      value: { type: "text", text: "some" },
    };
    expect(formatQuantity(fixed)).toBe("some");
  });

  it("should format range quantities with decimals", () => {
    const range: Range = {
      type: "range",
      min: { type: "decimal", decimal: 1 },
      max: { type: "decimal", decimal: 2 },
    };
    expect(formatQuantity(range)).toBe("1-2");
  });

  it("should format range quantities with fractions", () => {
    const range: Range = {
      type: "range",
      min: { type: "fraction", num: 1, den: 4 },
      max: { type: "fraction", num: 1, den: 2 },
    };
    expect(formatQuantity(range)).toBe("1/4-1/2");
  });

  it("should format range with mixed types", () => {
    const range: Range = {
      type: "range",
      min: { type: "decimal", decimal: 1 },
      max: { type: "fraction", num: 3, den: 2 },
    };
    expect(formatQuantity(range)).toBe("1-3/2");
  });
});

// ============================================================================
// formatUnit
// ============================================================================

describe("formatUnit", () => {
  it("should format string units", () => {
    expect(formatUnit("g")).toBe("g");
  });

  it("should format Unit objects", () => {
    const unit: Unit = { name: "grams" };
    expect(formatUnit(unit)).toBe("grams");
  });

  it("should return empty string for undefined", () => {
    expect(formatUnit(undefined)).toBe("");
  });

  it("should return empty string for empty string", () => {
    expect(formatUnit("")).toBe("");
  });
});

// ============================================================================
// formatQuantityWithUnit
// ============================================================================

describe("formatQuantityWithUnit", () => {
  it("should format quantity with string unit", () => {
    const fixed: FixedValue = {
      type: "fixed",
      value: { type: "decimal", decimal: 100 },
    };
    expect(formatQuantityWithUnit(fixed, "g")).toBe("100 g");
  });

  it("should format quantity with Unit object", () => {
    const fixed: FixedValue = {
      type: "fixed",
      value: { type: "decimal", decimal: 2 },
    };
    const unit: Unit = { name: "cups" };
    expect(formatQuantityWithUnit(fixed, unit)).toBe("2 cups");
  });

  it("should format quantity without unit", () => {
    const fixed: FixedValue = {
      type: "fixed",
      value: { type: "decimal", decimal: 3 },
    };
    expect(formatQuantityWithUnit(fixed, undefined)).toBe("3");
  });

  it("should return empty string for undefined quantity", () => {
    expect(formatQuantityWithUnit(undefined, "g")).toBe("");
  });

  it("should format range with unit", () => {
    const range: Range = {
      type: "range",
      min: { type: "decimal", decimal: 1 },
      max: { type: "decimal", decimal: 2 },
    };
    expect(formatQuantityWithUnit(range, "tsp")).toBe("1-2 tsp");
  });
});

// ============================================================================
// formatExtendedQuantity
// ============================================================================

describe("formatExtendedQuantity", () => {
  it("should format quantity with extended unit", () => {
    const item: QuantityWithExtendedUnit = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 250 } },
      unit: { name: "ml" },
    };
    expect(formatExtendedQuantity(item)).toBe("250 ml");
  });

  it("should format quantity without unit", () => {
    const item: QuantityWithExtendedUnit = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
    };
    expect(formatExtendedQuantity(item)).toBe("2");
  });
});

// ============================================================================
// formatItemQuantity
// ============================================================================

describe("formatItemQuantity", () => {
  it("should format single quantity without equivalents", () => {
    const itemQty: IngredientItemQuantity = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
      unit: { name: "g" },
      scalable: true,
    };
    expect(formatItemQuantity(itemQty)).toBe("100 g");
  });

  it("should format quantity with equivalents using default separator", () => {
    const itemQty: IngredientItemQuantity = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
      unit: { name: "g" },
      equivalents: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 3.5 } },
          unit: { name: "oz" },
        },
      ],
      scalable: true,
    };
    expect(formatItemQuantity(itemQty)).toBe("100 g | 3.5 oz");
  });

  it("should format quantity with custom separator", () => {
    const itemQty: IngredientItemQuantity = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
      unit: { name: "g" },
      equivalents: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 3.5 } },
          unit: { name: "oz" },
        },
      ],
      scalable: true,
    };
    expect(formatItemQuantity(itemQty, " / ")).toBe("100 g / 3.5 oz");
  });

  it("should format multiple equivalents", () => {
    const itemQty: IngredientItemQuantity = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 240 } },
      unit: { name: "ml" },
      equivalents: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: { name: "cup" },
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 8 } },
          unit: { name: "fl oz" },
        },
      ],
      scalable: true,
    };
    expect(formatItemQuantity(itemQty)).toBe("240 ml | 1 cup | 8 fl oz");
  });
});

// ============================================================================
// isGroupedItem
// ============================================================================

describe("isGroupedItem", () => {
  it("should return true for grouped items", () => {
    const item: IngredientItem = {
      type: "ingredient",
      id: "ingredient-item-0",
      group: "milk",
      alternatives: [{ displayName: "milk", index: 1 }],
    };
    expect(isGroupedItem(item)).toBe(true);
  });

  it("should return false for inline items", () => {
    const item: IngredientItem = {
      type: "ingredient",
      id: "ingredient-item-0",
      alternatives: [
        { displayName: "butter", index: 1 },
        { displayName: "oil", index: 2 },
      ],
    };
    expect(isGroupedItem(item)).toBe(false);
  });
});

// ============================================================================
// isAlternativeSelected
// ============================================================================

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
