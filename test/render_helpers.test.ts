import { describe, it, expect } from "vitest";

import {
  renderFractionAsVulgar,
  formatNumericValue,
  formatSingleValue,
  formatQuantity,
  formatUnit,
  formatQuantityWithUnit,
  formatExtendedQuantity,
  formatItemQuantity,
  isGroupedItem,
  isAlternativeSelected,
  isSectionActive,
  isStepActive,
  getEffectiveChoices,
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
  MaybeScalableQuantity,
} from "../src/types";
import {
  recipeWithInlineAlternatives,
  recipeWithGroupedAlternatives,
} from "./fixtures/recipes";
import { Section } from "../src";

// ============================================================================
// renderFractionAsVulgar
// ============================================================================

describe("renderFractionAsVulgar", () => {
  it("should render common fractions as vulgar characters", () => {
    expect(renderFractionAsVulgar(1, 2)).toBe("½");
    expect(renderFractionAsVulgar(1, 3)).toBe("⅓");
    expect(renderFractionAsVulgar(2, 3)).toBe("⅔");
    expect(renderFractionAsVulgar(1, 4)).toBe("¼");
    expect(renderFractionAsVulgar(3, 4)).toBe("¾");
    expect(renderFractionAsVulgar(1, 8)).toBe("⅛");
    expect(renderFractionAsVulgar(3, 8)).toBe("⅜");
    expect(renderFractionAsVulgar(5, 8)).toBe("⅝");
    expect(renderFractionAsVulgar(7, 8)).toBe("⅞");
  });

  it("should fall back to plain text for uncommon fractions", () => {
    expect(renderFractionAsVulgar(2, 5)).toBe("2/5");
    expect(renderFractionAsVulgar(3, 7)).toBe("3/7");
  });

  it("should handle improper fractions (mixed numbers)", () => {
    expect(renderFractionAsVulgar(5, 4)).toBe("1¼");
    expect(renderFractionAsVulgar(7, 3)).toBe("2⅓");
    expect(renderFractionAsVulgar(11, 8)).toBe("1⅜");
    expect(renderFractionAsVulgar(9, 4)).toBe("2¼");
  });

  it("should handle improper fractions without vulgar characters", () => {
    expect(renderFractionAsVulgar(7, 5)).toBe("1 2/5");
    expect(renderFractionAsVulgar(10, 7)).toBe("1 3/7");
  });

  it("should handle exact integers from improper fractions", () => {
    expect(renderFractionAsVulgar(4, 2)).toBe("2");
    expect(renderFractionAsVulgar(9, 3)).toBe("3");
    expect(renderFractionAsVulgar(8, 4)).toBe("2");
  });
});

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
    expect(formatNumericValue(fraction)).toBe("½");
  });

  it("should format fraction values with vulgar characters by default", () => {
    expect(formatNumericValue({ type: "fraction", num: 1, den: 2 })).toBe("½");
    expect(formatNumericValue({ type: "fraction", num: 3, den: 4 })).toBe("¾");
    expect(formatNumericValue({ type: "fraction", num: 5, den: 4 })).toBe("1¼");
  });

  it("should format fraction values with vulgar characters when useVulgar is false", () => {
    expect(
      formatNumericValue({ type: "fraction", num: 1, den: 2 }, false),
    ).toBe("1/2");
    expect(
      formatNumericValue({ type: "fraction", num: 3, den: 4 }, false),
    ).toBe("3/4");
    expect(
      formatNumericValue({ type: "fraction", num: 5, den: 4 }, false),
    ).toBe("5/4");
  });

  it("should not affect decimal values by default", () => {
    const decimal: DecimalValue = { type: "decimal", decimal: 1.5 };
    expect(formatNumericValue(decimal)).toBe("1.5");
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
    expect(formatSingleValue(fraction)).toBe("¾");
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
    expect(formatQuantity(range)).toBe("¼-½");
  });

  it("should format range with mixed types", () => {
    const range: Range = {
      type: "range",
      min: { type: "decimal", decimal: 1 },
      max: { type: "fraction", num: 3, den: 2 },
    };
    expect(formatQuantity(range)).toBe("1-1½");
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

  it("should format quantity with unit first and no space", () => {
    const fixed: FixedValue = {
      type: "fixed",
      value: { type: "decimal", decimal: 1 },
    };
    expect(formatQuantityWithUnit(fixed, "大さじ", "unit-first")).toBe(
      "大さじ1",
    );
  });

  it("should ignore unit order when unit is missing", () => {
    const fixed: FixedValue = {
      type: "fixed",
      value: { type: "decimal", decimal: 3 },
    };
    expect(formatQuantityWithUnit(fixed, undefined, "unit-first")).toBe("3");
  });

  it("should use unit-first when Unit object carries unitOrder", () => {
    const fixed: FixedValue = {
      type: "fixed",
      value: { type: "decimal", decimal: 2 },
    };
    const unit: Unit = { name: "大さじ", unitOrder: "unit-first" };
    expect(formatQuantityWithUnit(fixed, unit)).toBe("大さじ2");
  });

  it("should let explicit override take precedence over unit.unitOrder", () => {
    const fixed: FixedValue = {
      type: "fixed",
      value: { type: "decimal", decimal: 2 },
    };
    const unit: Unit = { name: "大さじ", unitOrder: "unit-first" };
    expect(formatQuantityWithUnit(fixed, unit, "quantity-first")).toBe(
      "2 大さじ",
    );
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

  it("should support unit-first formatting", () => {
    const item: QuantityWithExtendedUnit = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
      unit: { name: "大さじ" },
    };
    expect(formatExtendedQuantity(item, "unit-first")).toBe("大さじ1");
  });

  it("should use unit-first automatically when unit carries unitOrder", () => {
    const item: QuantityWithExtendedUnit = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
      unit: { name: "大さじ", unitOrder: "unit-first" },
    };
    expect(formatExtendedQuantity(item)).toBe("大さじ1");
  });
});

// ============================================================================
// formatItemQuantity
// ============================================================================

describe("formatItemQuantity", () => {
  it("should format single quantity without equivalents", () => {
    const itemQty: QuantityWithExtendedUnit & { scalable: boolean } = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
      unit: { name: "g" },
      scalable: true,
    };
    expect(formatItemQuantity(itemQty)).toBe("100 g");
  });

  it("should format quantity with equivalents using default separator", () => {
    const itemQty: MaybeScalableQuantity = {
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
    const itemQty: MaybeScalableQuantity = {
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
    const itemQty: MaybeScalableQuantity = {
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

  it("should thread unit-first formatting to primary and equivalents", () => {
    const itemQty: MaybeScalableQuantity = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
      unit: { name: "大さじ" },
      equivalents: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 3 } },
          unit: { name: "小さじ" },
        },
      ],
      scalable: true,
    };
    expect(formatItemQuantity(itemQty, " | ", "unit-first")).toBe(
      "大さじ1 | 小さじ3",
    );
  });

  it("should auto-detect unit-first per unit when units carry unitOrder", () => {
    const itemQty: MaybeScalableQuantity = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
      unit: { name: "大さじ", unitOrder: "unit-first" },
      equivalents: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
          unit: { name: "ml" },
        },
      ],
      scalable: true,
    };
    // Primary uses unit-first from unit.unitOrder; equivalent has no unitOrder so quantity-first
    expect(formatItemQuantity(itemQty)).toBe("大さじ1 | 100 ml");
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

  it("should return true for first grouped alternative when selected index is 0", () => {
    const recipe = new Recipe(recipeWithGroupedAlternatives);
    const choicesGrouped: RecipeChoices = {
      ingredientGroups: new Map([
        ["milk", 0], // Select first (index 0) alternative in group
      ]),
    };
    const step = recipe.sections[0]!.content[0] as Step;
    const item0 = step.items.find(
      (i) => i.type === "ingredient" && i.id === "ingredient-item-0",
    ) as IngredientItem;
    const item1 = step.items.find(
      (i) => i.type === "ingredient" && i.id === "ingredient-item-1",
    ) as IngredientItem;
    expect(isAlternativeSelected(recipe, choicesGrouped, item0)).toBe(true);
    expect(isAlternativeSelected(recipe, choicesGrouped, item1)).toBe(false);
  });
});

describe("isSectionActive", () => {
  it("returns true for sections without variants", () => {
    const section = new Section("Base");
    expect(isSectionActive(section)).toBe(true);
    expect(isSectionActive(section, "vegan")).toBe(true);
    expect(isSectionActive(section, "*")).toBe(true);
  });

  it("returns true for [*] section when default variant selected", () => {
    const section = new Section("Classic", ["*"]);
    expect(isSectionActive(section)).toBe(true);
    expect(isSectionActive(section, "*")).toBe(true);
  });

  it("returns false for [*] section when named variant selected", () => {
    const section = new Section("Classic", ["*"]);
    expect(isSectionActive(section, "vegan")).toBe(false);
  });

  it("returns true for named variant section when that variant is selected", () => {
    const section = new Section("Vegan Sauce", ["vegan"]);
    expect(isSectionActive(section, "vegan")).toBe(true);
  });

  it("returns false for named variant section when default variant selected", () => {
    const section = new Section("Vegan Sauce", ["vegan"]);
    expect(isSectionActive(section)).toBe(false);
  });

  it("returns false for named variant section when different variant selected", () => {
    const section = new Section("Vegan Sauce", ["vegan"]);
    expect(isSectionActive(section, "gluten-free")).toBe(false);
  });

  it("handles multi-variant sections", () => {
    const section = new Section("Plant-based", ["vegan", "vegetarian"]);
    expect(isSectionActive(section, "vegan")).toBe(true);
    expect(isSectionActive(section, "vegetarian")).toBe(true);
    expect(isSectionActive(section, "gluten-free")).toBe(false);
    expect(isSectionActive(section)).toBe(false);
  });
});

describe("isStepActive", () => {
  it("returns true for steps without variants", () => {
    const step: Step = { type: "step", items: [] };
    expect(isStepActive(step)).toBe(true);
    expect(isStepActive(step, "vegan")).toBe(true);
  });

  it("returns true for [*] step when default variant selected", () => {
    const step: Step = { type: "step", items: [], variants: ["*"] };
    expect(isStepActive(step)).toBe(true);
    expect(isStepActive(step, "*")).toBe(true);
  });

  it("returns false for [*] step when named variant selected", () => {
    const step: Step = { type: "step", items: [], variants: ["*"] };
    expect(isStepActive(step, "vegan")).toBe(false);
  });

  it("returns true for named variant step when that variant is selected", () => {
    const step: Step = { type: "step", items: [], variants: ["vegan"] };
    expect(isStepActive(step, "vegan")).toBe(true);
  });

  it("returns false for named variant step when different variant selected", () => {
    const step: Step = { type: "step", items: [], variants: ["vegan"] };
    expect(isStepActive(step, "gluten-free")).toBe(false);
  });

  it("handles multi-variant steps", () => {
    const step: Step = {
      type: "step",
      items: [],
      variants: ["vegan", "vegetarian"],
    };
    expect(isStepActive(step, "vegan")).toBe(true);
    expect(isStepActive(step, "vegetarian")).toBe(true);
    expect(isStepActive(step, "gluten-free")).toBe(false);
  });
});

describe("getEffectiveChoices", () => {
  const recipeWithNoteAutoSelection = `
---
servings: 1
---
Add @milk{200%ml}|oat milk{200%ml}[for a vegan version]|soy milk{200%ml}[another vegan option] to the mix.
`;

  const recipeWithGroupedNoteAutoSelection = `
---
servings: 1
---
Use @|protein|chicken{200%g} or @|protein|tofu{200%g}[for a vegan version] or @|protein|tempeh{200%g}[also vegan] in the stir fry.
`;

  it("returns empty choices for default variant", () => {
    const recipe = new Recipe(recipeWithNoteAutoSelection);
    const choices = getEffectiveChoices(recipe);
    expect(choices.variant).toBeUndefined();
    expect(choices.ingredientItems).toBeUndefined();
    expect(choices.ingredientGroups).toBeUndefined();
  });

  it("returns empty choices for * variant", () => {
    const recipe = new Recipe(recipeWithNoteAutoSelection);
    const choices = getEffectiveChoices(recipe, "*");
    expect(choices.variant).toBe("*");
    expect(choices.ingredientItems).toBeUndefined();
  });

  it("auto-selects inline alternative by note match", () => {
    const recipe = new Recipe(recipeWithNoteAutoSelection);
    const choices = getEffectiveChoices(recipe, "vegan");

    expect(choices.variant).toBe("vegan");
    expect(choices.ingredientItems).toBeDefined();
    // "for a vegan version" matches "vegan" - index 1 (oat milk)
    expect(choices.ingredientItems!.get("ingredient-item-0")).toBe(1);
  });

  it("auto-selects grouped alternative by note match", () => {
    const recipe = new Recipe(recipeWithGroupedNoteAutoSelection);
    const choices = getEffectiveChoices(recipe, "vegan");

    expect(choices.variant).toBe("vegan");
    expect(choices.ingredientGroups).toBeDefined();
    // Subgroup at index 1 (tofu, with note "for a vegan version") should be selected
    expect(choices.ingredientGroups!.get("protein")).toBe(1);
  });

  it("does not auto-select when no note matches", () => {
    const recipe = new Recipe(recipeWithNoteAutoSelection);
    const choices = getEffectiveChoices(recipe, "gluten-free");

    expect(choices.variant).toBe("gluten-free");
    expect(choices.ingredientItems).toBeUndefined();
  });

  it("is case-insensitive for note matching", () => {
    const recipe = new Recipe(
      `Add @milk{200%ml}|oat milk{200%ml}[For a VEGAN Version] to the mix.`,
    );
    const choices = getEffectiveChoices(recipe, "vegan");

    expect(choices.ingredientItems).toBeDefined();
    expect(choices.ingredientItems!.get("ingredient-item-0")).toBe(1);
  });

  it("ignores note matches from inactive variant-linked steps", () => {
    const recipe = new Recipe(`
[*] Add @milk{200%ml}|oat milk{200%ml}[for vegan default note].

[vegan] Add @water{100%ml}|broth{100%ml}[for vegan].

[*] Use @|protein|chicken{200%g} or @|protein|turkey{200%g}[vegan marker].

[vegan] Use @|protein|tofu{200%g}[for vegan] or @|protein|tempeh{200%g}[for vegan].
`);

    const choices = getEffectiveChoices(recipe, "vegan");

    // Only the [vegan] inline item should be selectable.
    expect(choices.ingredientItems).toBeDefined();
    expect(Array.from(choices.ingredientItems!.values())).toEqual([1]);

    // The [vegan] grouped subgroups should be selected, not default ones.
    expect(choices.ingredientGroups?.get("protein")).toBe(0);
  });
});
