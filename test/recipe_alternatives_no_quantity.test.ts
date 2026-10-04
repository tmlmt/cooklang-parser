import { describe, it, expect } from "vitest";
import { Recipe } from "../src/classes/recipe";
import { ShoppingList } from "../src/classes/shopping_list";
import type { IngredientAlternativesOnlyGroup } from "../src/types";

const find = (recipe: Recipe, name: string, opts?: object) =>
  recipe.getIngredientQuantities(opts).find((i) => i.name === name)!;

describe("alternatives on ingredients without quantity", () => {
  it("keeps alternatives when both ingredients have no quantity", () => {
    const recipe = new Recipe("Add @butter{}|@olive oil{}.");
    const butter = find(recipe, "butter");
    expect(butter.usedAsPrimary).toBe(true);
    expect(butter.quantities).toEqual<IngredientAlternativesOnlyGroup[]>([
      { alternatives: [[{ index: 1 }]] },
    ]);
    expect(find(recipe, "olive oil").usedAsPrimary).toBeUndefined();
  });

  it("keeps the alternative's quantity when the primary has none", () => {
    const recipe = new Recipe("Add @butter{}|@olive oil{2%tbsp}.");
    expect(find(recipe, "butter").quantities).toEqual<
      IngredientAlternativesOnlyGroup[]
    >([
      {
        alternatives: [
          [
            {
              index: 1,
              quantities: [
                {
                  quantity: {
                    type: "fixed",
                    value: { type: "decimal", decimal: 2 },
                  },
                  unit: "tbsp",
                },
              ],
            },
          ],
        ],
      },
    ]);
  });

  it("still works when only the alternative has no quantity", () => {
    const recipe = new Recipe("Add @butter{100%g}|@olive oil{}.");
    expect(find(recipe, "butter").quantities).toMatchObject([
      { unit: "g", alternatives: [[{ index: 1 }]] },
    ]);
  });

  it("keeps alternatives for grouped syntax", () => {
    const recipe = new Recipe("Add @|fat|butter{} or @|fat|olive oil{2%tbsp}.");
    const quantities = find(recipe, "butter").quantities!;
    expect(quantities).toHaveLength(1);
    expect(quantities[0]).toMatchObject({
      alternatives: [[{ index: 1, quantities: [{ unit: "tbsp" }] }]],
    });
    expect(quantities[0]).not.toHaveProperty("quantity");
  });

  it("keeps a quantity group and an alternatives-only group side by side", () => {
    const recipe = new Recipe(
      "Add @butter{}|@olive oil{2%tbsp}.\n\nThen @&butter{50%g}.",
    );
    const quantities = find(recipe, "butter").quantities!;
    expect(quantities).toHaveLength(2);
    expect(quantities.some((q) => "quantity" in q)).toBe(true);
    expect(quantities.some((q) => !("quantity" in q))).toBe(true);
  });

  it("leaves quantities empty when the quantity-less alternative is chosen", () => {
    const recipe = new Recipe("Add @butter{100%g}|@olive oil{}.");
    const chosen = find(recipe, "olive oil", {
      choices: { ingredientItems: new Map([["ingredient-item-0", 1]]) },
    });
    expect(chosen.usedAsPrimary).toBe(true);
    expect(chosen.quantities).toBeUndefined();
  });

  it("does not add anything for a plain quantity-less ingredient", () => {
    const recipe = new Recipe("Add @salt.");
    expect(find(recipe, "salt").quantities).toBeUndefined();
  });

  it("returns no raw quantities and does not affect shopping lists", () => {
    const recipe = new Recipe("Add @butter{}|@olive oil{2%tbsp}.");
    expect(recipe.getRawQuantityGroups()).toMatchObject([
      { name: "butter", usedAsPrimary: true, quantities: [] },
      { name: "olive oil", quantities: [] },
    ]);
    const list = new ShoppingList();
    list.addRecipe(recipe, {
      choices: { ingredientItems: new Map([["ingredient-item-0", 0]]) },
    });
    expect(list.ingredients).toEqual([{ name: "butter" }]);
  });
});
