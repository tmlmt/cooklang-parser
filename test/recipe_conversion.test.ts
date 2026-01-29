import { describe, it, expect } from "vitest";
import { Recipe } from "../src/classes/recipe";
import type {
  IngredientItemQuantity,
  IngredientQuantityAndGroup,
} from "../src/types";

describe("Recipe.convertTo", () => {
  // Helper to get the first ingredient item quantity from a recipe
  function getFirstItemQuantity(
    recipe: Recipe,
  ): IngredientItemQuantity | undefined {
    const step = recipe.sections[0]?.content.find((c) => c.type === "step");
    if (!step || step.type !== "step") return undefined;
    const item = step.items.find((i) => i.type === "ingredient");
    if (!item || item.type !== "ingredient") return undefined;
    return item.alternatives[0]?.itemQuantity;
  }

  describe("when primary is already in target system", () => {
    it("keeps primary unchanged with 'keep' method", () => {
      const recipe = new Recipe("Add @flour{500%g}");
      const converted = recipe.convertTo("metric", "keep");

      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 500 } },
        unit: { name: "g" },
        scalable: true,
      };
      expect(itemQty).toEqual(expected);
    });

    it("primary replaced with 'replace' method", () => {
      const recipe = new Recipe("Add @flour{500%g}");
      const converted = recipe.convertTo("US", "replace");

      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 1.1 },
        },
        unit: { name: "lb" },
        scalable: true,
      };
      expect(itemQty).toEqual(expected);
    });

    it("removes equivalents with 'remove' method", () => {
      const recipe = new Recipe("Add @flour{500%g|1.1%lb}");
      const converted = recipe.convertTo("metric", "remove");

      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 500 } },
        unit: { name: "g" },
        scalable: true,
      };
      expect(itemQty).toEqual(expected);
    });

    it("preserves integerProtected flag when converting", () => {
      // =bag is an integer-protected unit
      const recipe = new Recipe("Add @chips{200%=g}");
      const converted = recipe.convertTo("US", "replace");

      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 7.05 } },
        unit: { name: "oz", integerProtected: true },
        scalable: true,
      };
      expect(itemQty).toEqual(expected);
    });
  });

  describe("when equivalent exists in target system", () => {
    it("swaps equivalent to primary with 'keep' method", () => {
      // Use fl-oz which is NOT compatible with metric (only US/UK)
      const recipe = new Recipe("Add @butter{2%fl-oz|56%g}");
      const converted = recipe.convertTo("metric", "keep");

      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 56 } },
        unit: { name: "g" },
        scalable: true,
        equivalents: [
          {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
            unit: { name: "fl-oz" },
          },
        ],
      };
      expect(itemQty).toEqual(expected);
    });

    it("swaps equivalent to primary with 'replace' method and keeps non-target equivalents", () => {
      // fl-oz (primary) is only US/UK compatible, g (equiv) is metric, tbsp is ambiguous
      // For 'replace':
      // - fl-oz was the old primary (discarded)
      // - g became the new primary
      // - tbsp remains in equivalents (it was not the old primary)
      const recipe = new Recipe("Add @butter{2%fl-oz|56%g|4%tbsp}");
      const converted = recipe.convertTo("metric", "replace");

      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 56 } },
        unit: { name: "g" },
        scalable: true,
        equivalents: [
          {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 4 } },
            unit: { name: "tbsp" },
          },
        ],
      };
      expect(itemQty).toEqual(expected);
    });

    it("swaps equivalent to primary with 'remove' method and clears equivalents", () => {
      const recipe = new Recipe("Add @butter{2%fl-oz|56%g}");
      const converted = recipe.convertTo("metric", "remove");

      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 56 } },
        unit: { name: "g" },
        scalable: true,
      };
      expect(itemQty).toEqual(expected);

      // Also the other way around
      const recipe2 = new Recipe("Add @butter{56%g|2%fl-oz}");
      const converted2 = recipe2.convertTo("metric", "remove");

      const itemQty2 = getFirstItemQuantity(converted2);
      const expected2: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 56 } },
        unit: { name: "g" },
        scalable: true,
      };
      expect(itemQty2).toEqual(expected2);
    });
  });

  describe("when conversion is needed (no equivalent in target system)", () => {
    it("converts primary to target system with 'keep' method", () => {
      const recipe = new Recipe("Add @flour{2%cup}");
      const converted = recipe.convertTo("metric", "keep");

      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 473 } },
        unit: { name: "ml" },
        scalable: true,
        equivalents: [
          {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
            unit: { name: "cup" },
          },
        ],
      };
      expect(itemQty).toEqual(expected);
    });

    it("converts primary to target system with 'replace' method", () => {
      const recipe = new Recipe("Add @flour{2%cup}");
      const converted = recipe.convertTo("metric", "replace");

      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 473 } },
        unit: { name: "ml" },
        scalable: true,
      };
      expect(itemQty).toEqual(expected);

      const recipe2 = new Recipe("Add @flour{1%bag|2%cup}");
      const converted2 = recipe2.convertTo("metric", "replace");

      const itemQty2 = getFirstItemQuantity(converted2);
      const expected2: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 473 } },
        unit: { name: "ml" },
        scalable: true,
      };
      expect(itemQty2).toEqual(expected2);
    });

    it("converts with 'replace' and filters out target-compatible equivalents", () => {
      // cup (primary, US/UK/metric compatible) with an existing ml equivalent
      // When converting to metric with 'replace':
      // - cup was the old primary (discarded)
      // - ml is metric-compatible (filtered out)
      // Result: only converted primary, no equivalents
      const recipe = new Recipe("Add @flour{2%cup|473%ml}");
      const converted = recipe.convertTo("metric", "replace");

      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 473 } },
        unit: { name: "ml" },
        scalable: true,
      };
      expect(itemQty).toEqual(expected);
    });

    it("converts primary to target system with 'remove' method and clears equivalents", () => {
      const recipe = new Recipe("Add @flour{2%cup|1%bag}");
      const converted = recipe.convertTo("metric", "remove");

      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 473 } },
        unit: { name: "ml" },
        scalable: true,
      };
      expect(itemQty).toEqual(expected);
    });

    it("converts from metric to US", () => {
      const recipe = new Recipe("Add @water{500%ml}");
      const converted = recipe.convertTo("US", "keep");

      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 2.11 },
        },
        unit: { name: "cup" },
        scalable: true,
        equivalents: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 500 },
            },
            unit: { name: "ml" },
          },
        ],
      };
      expect(itemQty).toEqual(expected);
    });

    it("handles correctly integerProtected units when converting", () => {
      // =bag is an integer-protected unit
      const recipe = new Recipe("Add @bananas{1%=large|1.5%cup}");
      const converted = recipe.convertTo("metric", "keep");
      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 355 } },
        unit: { name: "ml" },
        scalable: true,
        equivalents: [
          {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
            unit: { name: "large", integerProtected: true },
          },
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1.5 },
            },
            unit: { name: "cup" },
          },
        ],
      };
      expect(itemQty).toEqual(expected);
    });

    it("keeps all added equivalents with 'keep' method", () => {
      const recipe = new Recipe(
        "Add @bananas{1%=large|1.5%cup} and @&bananas{1%=small|1%cup}",
      );
      const converted = recipe.convertTo("metric", "keep");
      const ingQty = converted.ingredients[0]!.quantities![0];
      const expected: IngredientQuantityAndGroup = {
        and: [
          {
            quantity: {
              type: "fixed",
              value: {
                type: "decimal",
                decimal: 1,
              },
            },
            unit: "large",
          },
          {
            quantity: {
              type: "fixed",
              value: {
                type: "decimal",
                decimal: 1,
              },
            },
            unit: "small",
          },
        ],
        equivalents: [
          {
            quantity: {
              type: "fixed",
              value: {
                type: "decimal",
                decimal: 592,
              },
            },
            unit: "ml",
          },
          {
            quantity: {
              type: "fixed",
              value: {
                type: "fraction",
                num: 5,
                den: 2,
              },
            },
            unit: "cup",
          },
        ],
      };
      expect(ingQty).toEqual(expected);
    });

    it("getIngredientQuantities returns same result as ingredients after conversion", () => {
      const recipe = new Recipe(
        "Add @bananas{1%=large|1.5%cup} and @&bananas{1%=small|1%cup}",
      );
      const converted = recipe.convertTo("metric", "keep");

      // Both should have the same quantities
      const directQty = converted.ingredients[0]!.quantities![0];
      const computedQty =
        converted.getIngredientQuantities()[0]!.quantities![0];

      expect(computedQty).toEqual(directQty);
    });
  });

  describe("with unconvertible units", () => {
    it("keeps unknown units unchanged with 'keep' method", () => {
      const recipe = new Recipe("Add @eggs{3%large}");
      const converted = recipe.convertTo("metric", "keep");

      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 3 } },
        unit: { name: "large" },
        scalable: true,
      };
      expect(itemQty).toEqual(expected);
    });

    it("keeps unknown units but clears equivalents with 'remove' method", () => {
      const recipe = new Recipe("Add @eggs{3%large|180%g}");
      const converted = recipe.convertTo("metric", "remove");

      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 180 } },
        unit: { name: "g" },
        scalable: true,
      };
      expect(itemQty).toEqual(expected);
    });

    it("keeps unknown units and clears equivalents when no conversion possible with 'remove'", () => {
      // Unknown unit with no metric equivalent
      const recipe = new Recipe("Add @eggs{3%large}");
      const converted = recipe.convertTo("metric", "remove");

      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 3 } },
        unit: { name: "large" },
        scalable: true,
      };
      expect(itemQty).toEqual(expected);
    });

    it("keeps quantity without unit unchanged", () => {
      const recipe = new Recipe("Add @eggs{3}");
      const converted = recipe.convertTo("metric", "keep");

      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 3 } },
        scalable: true,
      };
      expect(itemQty).toEqual(expected);
    });

    it("handles text quantity values", () => {
      const recipe = new Recipe("Add @salt{one%cup}");
      const converted = recipe.convertTo("metric", "keep");

      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "text", text: "one" } },
        unit: { name: "cup" },
        scalable: true,
      };
      expect(itemQty).toEqual(expected);
    });
  });

  describe("updates recipe unit system", () => {
    it("sets unitSystem to the target system", () => {
      const recipe = new Recipe("Add @flour{2%cup}");
      expect(recipe.unitSystem).toBeUndefined();

      const converted = recipe.convertTo("metric", "replace");
      expect(converted.unitSystem).toBe("metric");
    });
  });

  describe("aggregates ingredients correctly", () => {
    it("re-aggregates ingredient quantities after conversion", () => {
      const recipe = new Recipe("Add @flour{100%g} and @&flour{200%g}");
      const converted = recipe.convertTo("metric", "keep");

      // Should have one aggregated ingredient
      expect(converted.ingredients).toHaveLength(1);
      expect(converted.ingredients[0]?.name).toBe("flour");

      const qty = converted.ingredients[0]?.quantities?.[0];
      // Aggregated quantities have a simpler structure (unit as string, no scalable)
      expect(qty).toEqual({
        quantity: { type: "fixed", value: { type: "decimal", decimal: 300 } },
        unit: "g",
      });
    });
  });

  describe("handles ingredient alternatives", () => {
    it("converts inline alternatives", () => {
      const recipe = new Recipe("Add @flour{2%cup}|@rice flour{2%cup}");
      const converted = recipe.convertTo("metric", "keep");

      // Both alternatives should be converted
      const step = converted.sections[0]?.content.find(
        (c) => c.type === "step",
      );
      if (step?.type !== "step") throw new Error("Expected step");
      const item = step.items.find((i) => i.type === "ingredient");
      if (item?.type !== "ingredient") throw new Error("Expected ingredient");

      const expectedItemQty: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 473 } },
        unit: { name: "ml" },
        scalable: true,
        equivalents: [
          {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
            unit: { name: "cup" },
          },
        ],
      };
      // Check both alternatives are converted
      for (const alt of item.alternatives) {
        expect(alt.itemQuantity).toEqual(expectedItemQty);
      }
    });
  });

  describe("handles ranges", () => {
    it("converts range quantities", () => {
      const recipe = new Recipe("Add @flour{1-2%cup}");
      const converted = recipe.convertTo("metric", "keep");

      const itemQty = getFirstItemQuantity(converted);
      const expected: IngredientItemQuantity = {
        quantity: {
          type: "range",
          min: { type: "decimal", decimal: 237 },
          max: { type: "decimal", decimal: 473 },
        },
        unit: { name: "ml" },
        scalable: true,
        equivalents: [
          {
            quantity: {
              type: "range",
              min: { type: "decimal", decimal: 1 },
              max: { type: "decimal", decimal: 2 },
            },
            unit: { name: "cup" },
          },
        ],
      };
      expect(itemQty).toEqual(expected);
    });
  });

  describe("does not mutate original recipe", () => {
    it("returns a new recipe instance", () => {
      const recipe = new Recipe("Add @flour{2%cup}");
      const converted = recipe.convertTo("metric", "keep");

      expect(converted).not.toBe(recipe);

      // Original should still have cup
      const originalQty = getFirstItemQuantity(recipe);
      const expectedOriginal: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
        unit: { name: "cup" },
        scalable: true,
      };
      expect(originalQty).toEqual(expectedOriginal);
    });
  });

  describe("handles grouped alternatives (choices)", () => {
    it("converts grouped alternatives", () => {
      const recipe = new Recipe(`
Add @|dairy|milk{1%cup} or @|dairy|cream{1%cup}
`);
      const converted = recipe.convertTo("metric", "keep");

      // Check choices are converted
      const groupAlts = converted.choices.ingredientGroups.get("dairy");
      expect(groupAlts).toBeDefined();

      const expectedItemQty: IngredientItemQuantity = {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 237 } },
        unit: { name: "ml" },
        scalable: true,
        equivalents: [
          {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
            unit: { name: "cup" },
          },
        ],
      };
      for (const alt of groupAlts ?? []) {
        expect(alt.itemQuantity).toEqual(expectedItemQty);
      }
    });
  });
});
