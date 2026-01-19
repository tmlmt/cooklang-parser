import { describe, it, expect } from "vitest";
import { Recipe } from "../src/classes/recipe";
import {
  simpleRecipe,
  complexRecipe,
  recipeToScaleWithAlternatives,
  recipeWithGroupedAlternatives,
  recipeWithInlineAlternatives,
} from "./fixtures/recipes";
import {
  InvalidQuantityFormat,
  ReferencedItemCannotBeRedefinedError,
} from "../src/errors";
import type { Ingredient, IngredientItem, Note, Step } from "../src/types";

describe("parse function", () => {
  it("parses basic metadata correctly", () => {
    const result = new Recipe(simpleRecipe);
    expect(result.metadata.title).toBe("Pancakes");
    expect(result.metadata.tags).toEqual(["breakfast", "easy"]);
  });

  describe("ingredients with variants", () => {
    it("extracts single word ingredient with quantity but without unit correctly", () => {
      const result = new Recipe("@eggs{3}");
      expect(result.sections.length).toBe(1);
      expect(result.sections[0]!.content).toEqual([
        {
          type: "step",
          items: [
            {
              type: "ingredient",
              id: "ingredient-item-0",
              alternatives: [
                {
                  displayName: "eggs",
                  index: 0,
                  itemQuantity: {
                    scalable: true,
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 3 },
                    },
                  },
                },
              ],
            },
          ],
        },
      ]);
      expect(result.ingredients).toEqual([
        {
          name: "eggs",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 3 },
              },
              unit: undefined,
            },
          ],
          usedAsPrimary: true,
        },
      ]);
    });

    it("throw an error if quantity has invalid format", () => {
      const recipe = "Add @flour{%two}";
      expect(() => new Recipe(recipe)).toThrowError(InvalidQuantityFormat);
    });

    it("extracts plain unquantified single-word ingredient correctly", () => {
      const result = new Recipe("@flour");
      expect(result.ingredients).toEqual([
        {
          name: "flour",
          usedAsPrimary: true,
        },
      ]);
    });

    it("extracts plain unquantified multi-word ingredient correctly", () => {
      const result = new Recipe("@coarse salt{}");
      expect(result.ingredients).toEqual([
        {
          name: "coarse salt",
          usedAsPrimary: true,
        },
      ]);
    });

    it("extracts single-word ingredient with quantity and unit correctly", () => {
      const result = new Recipe("@butter{30%g}");
      expect(result.ingredients).toEqual([
        {
          name: "butter",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 30 },
              },
              unit: "g",
            },
          ],
          usedAsPrimary: true,
        },
      ]);
    });

    it("parses ingredients followed by punctuation correctly", () => {
      const recipe = `
      Add @sugar{100%g}, @milk{200%mL}, and @eggs{3%dozen}.
      Add @sugar{1}, @milk{2}, and @eggs{3}.
      Add @sugar, @milk, and @eggs.`;
      const result = new Recipe(recipe);
      expect(result.ingredients.length).toBe(9);
      expect(result.ingredients.map((i) => i.name)).toEqual([
        "sugar",
        "milk",
        "eggs",
        "sugar",
        "milk",
        "eggs",
        "sugar",
        "milk",
        "eggs",
      ]);
    });

    describe("parses ingredients that are other recipes", () => {
      it("parses a recipe in the same directory as the current recipe", () => {
        const recipe1 = `
          Defrost @@pizza dough{1} and form it into a nice disc
          And @@toppings on top
        `;
        const result1 = new Recipe(recipe1);

        const expected_dough: Ingredient = {
          name: "pizza dough",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: undefined,
            },
          ],
          flags: ["recipe"],
          extras: {
            path: "pizza dough.cook",
          },
          usedAsPrimary: true,
        };
        const expected_toppings: Ingredient = {
          name: "toppings",
          flags: ["recipe"],
          extras: {
            path: "toppings.cook",
          },
          usedAsPrimary: true,
        };

        expect(result1.ingredients).toHaveLength(2);
        expect(result1.ingredients[0]).toEqual(expected_dough);
        expect(result1.ingredients[1]).toEqual(expected_toppings);

        const recipe2 = `
          Defrost @./pizza dough{1} and form it into a nice disc
          And @./toppings on top
        `;
        const result2 = new Recipe(recipe2);

        expect(result2.ingredients).toHaveLength(2);
        expect(result2.ingredients[0]).toEqual(expected_dough);
        expect(result2.ingredients[1]).toEqual(expected_toppings);
      });

      it("parses a recipe in a different relative directory", () => {
        const recipe1 = `
          Defrost @@some essentials/my.doughs/pizza dough{1} and form it into a nice disc
          And @@../some-essentials/toppings on top
        `;
        const result1 = new Recipe(recipe1);

        const expected_dough: Ingredient = {
          name: "pizza dough",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: undefined,
            },
          ],
          flags: ["recipe"],
          extras: {
            path: "some essentials/my.doughs/pizza dough.cook",
          },
          usedAsPrimary: true,
        };
        const expected_toppings: Ingredient = {
          name: "toppings",
          flags: ["recipe"],
          extras: {
            path: "../some-essentials/toppings.cook",
          },
          usedAsPrimary: true,
        };

        expect(result1.ingredients).toHaveLength(2);
        expect(result1.ingredients[0]).toEqual(expected_dough);
        expect(result1.ingredients[1]).toEqual(expected_toppings);

        const recipe2 = `
          Defrost @./some essentials/my.doughs/pizza dough{1} and form it into a nice disc
          And @./../some-essentials/toppings{} on top
        `;
        const result2 = new Recipe(recipe2);

        expect(result2.ingredients).toHaveLength(2);
        expect(result2.ingredients[0]).toEqual(expected_dough);
        expect(result2.ingredients[1]).toEqual(expected_toppings);
      });
    });

    it("parses ingredients with preparation", () => {
      const recipe = `
      Add some @wheat flour{100%g}(sifted).
      And @eggs{2}(large, beaten).
    `;
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0]).toEqual({
        name: "wheat flour",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 100 },
            },
            unit: "g",
          },
        ],
        preparation: "sifted",
        usedAsPrimary: true,
      });
      expect(result.ingredients[1]).toEqual({
        name: "eggs",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 2 },
            },
            unit: undefined,
          },
        ],
        preparation: "large, beaten",
        usedAsPrimary: true,
      });
    });

    it("parses hidden or optional ingredients", () => {
      const recipe = `
      Add some @-salt{}.
      And maybe some @?pepper{}.
    `;
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0]).toEqual({
        name: "salt",
        flags: ["hidden"],
        usedAsPrimary: true,
      });
      expect(result.ingredients[1]).toEqual({
        name: "pepper",
        flags: ["optional"],
        usedAsPrimary: true,
      });
    });

    it("parses hidden and optional ingredients", () => {
      const recipe = `
      Potentially add some @-?salt{}.
    `;
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0]).toEqual({
        name: "salt",
        flags: ["optional", "hidden"],
        usedAsPrimary: true,
      });
    });

    it("detects and correctly extracts ingredients aliases", () => {
      const recipe =
        new Recipe(`Mix @flour tipo 00|flour{100%g} with @water{300%mL}, 
    then add more @&flour tipo 00|flour{50%g}`);
      expect(recipe.sections[0]?.content).toEqual([
        {
          type: "step",
          items: [
            {
              type: "text",
              value: "Mix ",
            },
            {
              type: "ingredient",
              id: "ingredient-item-0",
              alternatives: [
                {
                  displayName: "flour",
                  index: 0,
                  itemQuantity: {
                    scalable: true,
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 100 },
                    },
                    unit: { name: "g" },
                  },
                },
              ],
            },
            {
              type: "text",
              value: " with ",
            },
            {
              type: "ingredient",
              id: "ingredient-item-1",
              alternatives: [
                {
                  displayName: "water",
                  index: 1,
                  itemQuantity: {
                    scalable: true,
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 300 },
                    },
                    unit: { name: "mL" },
                  },
                },
              ],
            },
            {
              type: "text",
              value: ", ",
            },
            {
              type: "text",
              value: "    then add more ",
            },
            {
              type: "ingredient",
              id: "ingredient-item-2",
              alternatives: [
                {
                  displayName: "flour",
                  index: 0,
                  itemQuantity: {
                    scalable: true,
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 50 },
                    },
                    unit: { name: "g" },
                  },
                },
              ],
            },
          ],
        },
      ]);
      expect(recipe.ingredients).toEqual([
        {
          name: "flour tipo 00",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 150 },
              },
              unit: "g",
            },
          ],
          usedAsPrimary: true,
        },
        {
          name: "water",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 300 },
              },
              unit: "mL",
            },
          ],
          usedAsPrimary: true,
        },
      ]);
    });
  });

  describe("ingredient referencing", () => {
    it("should add quantities of explicitly referenced ingredients with same units", () => {
      const recipe = `
        Add @flour{100%g}.
        Then add some more @&flour{50%g}.
      `;
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(1);
      // Quantities are merged opportunistically when units are compatible
      expect(result.ingredients[0]).toEqual({
        name: "flour",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 150 },
            },
            unit: "g",
          },
        ],
        usedAsPrimary: true,
      });
      // calc_ingredient_quantities returns the same result
      const computed = result.calc_ingredient_quantities();
      expect(computed[0]!.quantityTotal).toEqual({
        quantity: { type: "fixed", value: { type: "decimal", decimal: 150 } },
        unit: "g",
      });
    });

    it("should keep track of individual quantities in the preparation steps", () => {
      const recipe = `
        Add @flour{100%g}.
        Then add some more @&flour{50%g}.
      `;
      const result = new Recipe(recipe);
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0]?.content).toHaveLength(1);
      expect(result.sections[0]?.content).toEqual([
        {
          type: "step",
          items: [
            {
              type: "text",
              value: "Add ",
            },
            {
              type: "ingredient",
              id: "ingredient-item-0",
              alternatives: [
                {
                  displayName: "flour",
                  index: 0,
                  itemQuantity: {
                    scalable: true,
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 100 },
                    },
                    unit: { name: "g" },
                  },
                },
              ],
            },
            {
              type: "text",
              value: ".",
            },
            {
              type: "text",
              value: "        Then add some more ",
            },
            {
              type: "ingredient",
              id: "ingredient-item-1",
              alternatives: [
                {
                  displayName: "flour",
                  index: 0,
                  itemQuantity: {
                    scalable: true,
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 50 },
                    },
                    unit: { name: "g" },
                  },
                },
              ],
            },
            {
              type: "text",
              value: ".",
            },
          ],
        },
      ]);
    });

    it("should list ingredients separately if not referenced with '&'", () => {
      const recipe = `
        Add @flour{100%g}.
        Then add some more @flour{50%g}.
      `;
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0]).toEqual({
        name: "flour",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 100 },
            },
            unit: "g",
          },
        ],
        usedAsPrimary: true,
      });
      expect(result.ingredients[1]).toEqual({
        name: "flour",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 50 },
            },
            unit: "g",
          },
        ],
        usedAsPrimary: true,
      });
    });

    it("should ignore preparation given for ingredient items referencing another one", () => {
      const result = new Recipe(`Mix @eggs{1}(boiled) and @&eggs{1}(poached)`);
      expect(result.ingredients).toEqual([
        {
          name: "eggs",
          preparation: "boiled",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: {
                  type: "decimal",
                  decimal: 2,
                },
              },
              unit: undefined,
            },
          ],
          usedAsPrimary: true,
        },
      ]);
      expect(result.sections[0]?.content).toEqual([
        {
          type: "step",
          items: [
            {
              type: "text",
              value: "Mix ",
            },
            {
              type: "ingredient",
              id: "ingredient-item-0",
              alternatives: [
                {
                  displayName: "eggs",
                  index: 0,
                  itemQuantity: {
                    scalable: true,
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 1 },
                    },
                  },
                },
              ],
            },
            {
              type: "text",
              value: " and ",
            },
            {
              type: "ingredient",
              id: "ingredient-item-1",
              alternatives: [
                {
                  displayName: "eggs",
                  index: 0,
                  itemQuantity: {
                    scalable: true,
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 1 },
                    },
                  },
                },
              ],
            },
          ],
        },
      ]);
    });

    it("should combine explicitly referenced ingredients case-insensitively", () => {
      const recipe = `
        Add @Sugar{100%g}.
        Then add some more @&sugar{50%g}.
      `;
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0]).toEqual({
        name: "Sugar", // Note: original casing is preserved
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 150 },
            },
            unit: "g",
          },
        ],
        usedAsPrimary: true,
      });
    });

    it("should add quantities and convert to largest unit", () => {
      const recipe = `
        Add @sugar{500%g}.
        Then add some more @&sugar{1%kg}.
      `;
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0]).toEqual({
        name: "sugar",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1.5 },
            },
            unit: "kg",
          },
        ],
        usedAsPrimary: true,
      });
    });

    it("should add quantities and convert to metric", () => {
      const recipe = `
        Add @butter{1%lb}.
        Then add some more @&butter{250%g}.
      `;
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(1);
      const butter = result.ingredients[0]!;
      expect(butter.name).toBe("butter");
      expect(butter.quantities).toEqual([
        {
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 0.704 },
          },
          unit: "kg",
        },
      ]);
      // TODO: 700g would be more elegant
    });

    it("should throw an error if referenced ingredient does not exist", () => {
      const recipe = `Add @&flour{100%g}.`;
      expect(() => new Recipe(recipe)).toThrow(
        /Referenced ingredient "flour" not found/,
      );
    });

    it("should throw an error if referenced ingredient does not have the same flags", () => {
      const recipe = `Add @flour{100%g} and more @&-flour{100%g}.`;
      expect(() => new Recipe(recipe)).toThrowError(
        ReferencedItemCannotBeRedefinedError,
      );
    });

    it("simply add quantities to the referenced ingredients as separate ones if units are incompatible", () => {
      const recipe = `
        Add @water{1%l}.
        Then add some more @&water{1%kg}.
      `;
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0]).toEqual({
        name: "water",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1 },
            },
            unit: "l",
          },
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1 },
            },
            unit: "kg",
          },
        ],
        usedAsPrimary: true,
      });
    });
  });

  describe("cookware parsing", () => {
    it("extracts cookware correctly", () => {
      const result = new Recipe(simpleRecipe);
      expect(result.cookware.length).toBe(2);
      expect(result.cookware[0]).toEqual({
        name: "bowl",
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
      });
      expect(result.cookware[1]).toEqual({
        name: "pan",
      });
    });

    it("parses cookware followed by punctuation correctly", () => {
      const recipe = `
      Use #bowl, #spoon, and #pan.
      Use #bowl{1}, #spoon{2}, and #pan{3}.`;
      const result = new Recipe(recipe);
      expect(result.cookware.length).toBe(6);
      expect(result.cookware.map((i) => i.name)).toEqual([
        "bowl",
        "spoon",
        "pan",
        "bowl",
        "spoon",
        "pan",
      ]);
    });

    it("should correctly track and sum quantities of referenced cookware", () => {
      const recipe = `
        Use #bowl{1} and again #&bowl{2}
      `;
      const result = new Recipe(recipe);
      expect(result.cookware).toHaveLength(1);
      expect(result.cookware[0]!.quantity).toEqual({
        type: "fixed",
        value: { type: "decimal", decimal: 3 },
      });
    });

    it("should correctly handle modifiers for cookware", () => {
      const recipe = `
        Use an #oven or a #?pan to cook. Clean the #&oven after use. Don't bother using a #-stove
      `;
      const result = new Recipe(recipe);
      expect(result.cookware).toHaveLength(3);
      expect(result.cookware[0]).toEqual({
        name: "oven",
      });
      expect(result.cookware[1]).toEqual({
        name: "pan",
        flags: ["optional"],
      });
      expect(result.cookware[2]).toEqual({
        name: "stove",
        flags: ["hidden"],
      });
    });

    it("should throw an error if referenced cookware does not have the same flags", () => {
      const recipe = `Potentially use an #oven once, and potentially the same #&?oven again`;
      expect(() => new Recipe(recipe)).toThrowError(
        ReferencedItemCannotBeRedefinedError,
      );
    });
  });

  it("extracts timers correctly", () => {
    const result = new Recipe(simpleRecipe);
    expect(result.timers.length).toBe(1);
    expect(result.timers[0]).toEqual({
      duration: { type: "fixed", value: { type: "decimal", decimal: 15 } },
      unit: "minutes",
    }); // Note: timer name may be empty based on regex
  });

  it("extracts steps correctly", () => {
    const result = new Recipe(simpleRecipe);
    expect(result.sections).toMatchSnapshot();
  });

  it("throws error for missing timer unit", () => {
    const badInput = "Cook for ~{15}";
    expect(() => new Recipe(badInput)).toThrow(/Timer missing unit/);
  });

  it("ignores comments and comments blocks", () => {
    const recipeWithComments = `
This is a step.
      
-- This is a comment that should be ignored

This is another step [- with a block comment -] which continues here.`;
    const result = new Recipe(recipeWithComments);
    expect(result.sections[0]?.content).toEqual([
      {
        type: "step",
        items: [
          {
            type: "text",
            value: "This is a step.",
          },
        ],
      },
      {
        type: "step",
        items: [
          {
            type: "text",
            value: "This is another step which continues here.",
          },
        ],
      },
    ]);
  });

  it("detects and identifies correctly new section after any kind of item", () => {
    const recipeWithSections = `
= Section 1

This is a preparation step

== Section 2 ==

[- This is a comment -]

= Section 3

> Now a note

=== Section 4  =

And a final step`;
    const result = new Recipe(recipeWithSections);
    expect(result.sections).toHaveLength(4);
    expect(result.sections[0]).toMatchObject({ name: "Section 1" });
    expect(result.sections[1]).toMatchObject({ name: "Section 2" });
    expect(result.sections[2]).toMatchObject({ name: "Section 3" });
    expect(result.sections[3]).toMatchObject({ name: "Section 4" });
  });

  it("parses notes correctly", () => {
    const recipeWithNotes = `
> This is a note at the beginning.

Add @flour{100%g}
> and this.

> This is a note in the middle
 which continues on the next line.

Another step.

> Another note
> on multiple lines starting with >
> for readability

> A final note.
`;
    const result = new Recipe(recipeWithNotes);
    expect(result.sections).toMatchSnapshot();
  });

  it("parses complex recipes correctly", () => {
    const result = new Recipe(complexRecipe);
    expect(result).toMatchSnapshot();
  });

  describe("grouped alternative ingredients", () => {
    describe("parses ingredients that are other recipes", () => {
      it("parses a recipe in the same directory as the current recipe", () => {
        const recipe1 = `
          Defrost @|dough|@pizza dough{1} and form it into a nice disc
          And @|toppings|@toppings on top
        `;
        const result1 = new Recipe(recipe1);

        const expected_dough: Ingredient = {
          name: "pizza dough",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: undefined,
            },
          ],
          flags: ["recipe"],
          extras: {
            path: "pizza dough.cook",
          },
          usedAsPrimary: true,
        };
        const expected_toppings: Ingredient = {
          name: "toppings",
          flags: ["recipe"],
          extras: {
            path: "toppings.cook",
          },
          usedAsPrimary: true,
        };

        expect(result1.ingredients).toHaveLength(2);
        expect(result1.choices.ingredientGroups.has("dough")).toBe(true);
        expect(result1.ingredients[0]).toEqual(expected_dough);
        expect(result1.ingredients[1]).toEqual(expected_toppings);

        const recipe2 = `
          Defrost @|dough|./pizza dough{1} and form it into a nice disc
          And @|toppings|./toppings on top
        `;
        const result2 = new Recipe(recipe2);

        expect(result2.ingredients).toHaveLength(2);
        expect(result2.choices.ingredientGroups.has("dough")).toBe(true);
        expect(result2.ingredients[0]).toEqual(expected_dough);
        expect(result2.ingredients[1]).toEqual(expected_toppings);
        expect(result2.choices.ingredientGroups.has("dough")).toBe(true);
      });

      it("parses a recipe in a different relative directory", () => {
        const recipe1 = `
          Defrost @|dough|@some essentials/my.doughs/pizza dough{1} and form it into a nice disc
          And @|toppings|@../some-essentials/toppings on top
        `;
        const result1 = new Recipe(recipe1);

        const expected_dough: Ingredient = {
          name: "pizza dough",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: undefined,
            },
          ],
          flags: ["recipe"],
          extras: {
            path: "some essentials/my.doughs/pizza dough.cook",
          },
          usedAsPrimary: true,
        };
        const expected_toppings: Ingredient = {
          name: "toppings",
          flags: ["recipe"],
          extras: {
            path: "../some-essentials/toppings.cook",
          },
          usedAsPrimary: true,
        };

        expect(result1.ingredients).toHaveLength(2);
        expect(result1.ingredients[0]).toEqual(expected_dough);
        expect(result1.ingredients[1]).toEqual(expected_toppings);

        const recipe2 = `
          Defrost @./some essentials/my.doughs/pizza dough{1} and form it into a nice disc
          And @./../some-essentials/toppings{} on top
        `;
        const result2 = new Recipe(recipe2);

        expect(result2.ingredients).toHaveLength(2);
        expect(result2.ingredients[0]).toEqual(expected_dough);
        expect(result2.ingredients[1]).toEqual(expected_toppings);
      });
    });

    it("parses ingredients with preparation", () => {
      const recipe = `
      Add some @|flour|wheat flour{100%g}(sifted).
      And @|eggs|eggs{2}(large, beaten).
    `;
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(2);
      expect(result.choices.ingredientGroups.has("flour")).toBe(true);
      expect(result.ingredients[0]).toEqual({
        name: "wheat flour",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 100 },
            },
            unit: "g",
          },
        ],
        preparation: "sifted",
        usedAsPrimary: true,
      });
      expect(result.choices.ingredientGroups.has("eggs")).toBe(true);
      expect(result.ingredients[1]).toEqual({
        name: "eggs",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 2 },
            },
            unit: undefined,
          },
        ],
        preparation: "large, beaten",
        usedAsPrimary: true,
      });
    });

    it("parses hidden or optional ingredients", () => {
      const recipe = `
      Add some @|spices|-salt{}.
      or maybe some @|spices|?pepper{}.
    `;
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(2);
      expect(result.choices.ingredientGroups.has("spices")).toBe(true);
      expect(result.ingredients[0]).toEqual({
        name: "salt",
        flags: ["hidden"],
        alternatives: new Set([1]),
        usedAsPrimary: true,
      });
      expect(result.ingredients[1]).toEqual({
        name: "pepper",
        flags: ["optional"],
        alternatives: new Set([0]),
      });
    });

    it("parses hidden and optional ingredients", () => {
      const recipe = `
      Potentially add some @|spices|-?salt{}.
    `;
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(1);
      expect(result.choices.ingredientGroups.has("spices")).toBe(true);
      expect(result.ingredients[0]).toEqual({
        name: "salt",
        flags: ["optional", "hidden"],
        usedAsPrimary: true,
      });
    });

    it("detects and correctly extracts ingredients aliases and references", () => {
      const recipe =
        new Recipe(`Mix @flour tipo 00{100%g} with either an extra @|flour|&flour tipo 00|same flour{100%g}, 
    or @|flour|flour tipo 1|whole wheat flour{50%g}`);
      expect(recipe.sections[0]?.content).toEqual([
        {
          type: "step",
          items: [
            {
              type: "text",
              value: "Mix ",
            },
            {
              type: "ingredient",
              id: "ingredient-item-0",
              alternatives: [
                {
                  displayName: "flour tipo 00",
                  index: 0,
                  itemQuantity: {
                    scalable: true,
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 100 },
                    },
                    unit: { name: "g" },
                  },
                },
              ],
            },
            {
              type: "text",
              value: " with either an extra ",
            },
            {
              type: "ingredient",
              id: "ingredient-item-1",
              group: "flour",
              alternatives: [
                {
                  displayName: "same flour",
                  index: 0,
                  itemQuantity: {
                    scalable: true,
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 100 },
                    },
                    unit: { name: "g" },
                  },
                },
              ],
            },
            {
              type: "text",
              value: ", ",
            },
            {
              type: "text",
              value: "    or ",
            },
            {
              type: "ingredient",
              id: "ingredient-item-2",
              group: "flour",
              alternatives: [
                {
                  displayName: "whole wheat flour",
                  index: 1,
                  itemQuantity: {
                    scalable: true,
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 50 },
                    },
                    unit: { name: "g" },
                  },
                },
              ],
            },
          ],
        },
      ]);
      expect(recipe.ingredients).toEqual([
        {
          name: "flour tipo 00",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 100 },
              },
              unit: "g",
            },
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 100 },
              },
              unit: "g",
              alternatives: [
                {
                  index: 1,
                  quantities: [
                    {
                      quantity: {
                        type: "fixed",
                        value: { type: "decimal", decimal: 50 },
                      },
                      unit: "g",
                    },
                  ],
                },
              ],
            },
          ],
          alternatives: new Set([1]),
          usedAsPrimary: true,
        },
        {
          name: "flour tipo 1",
          alternatives: new Set([0]),
        },
      ]);
    });

    it("parses grouped alternatives correctly", () => {
      const result = new Recipe(recipeWithGroupedAlternatives);
      expect(result.ingredients).toHaveLength(3);
      // All ingredients have their quantities stored as they appear in the recipe
      // For grouped alternatives, the primary ingredient's quantities field includes alternatives
      const milkIngredient: Ingredient = {
        name: "milk",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 200 },
            },
            unit: "ml",
            alternatives: [
              {
                index: 1,
                quantities: [
                  {
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 100 },
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
                      value: { type: "decimal", decimal: 150 },
                    },
                    unit: "ml",
                  },
                ],
              },
            ],
          },
        ],
        alternatives: new Set([1, 2]),
        usedAsPrimary: true,
      };
      expect(result.ingredients[0]).toEqual(milkIngredient);
      // Non-primary grouped alternatives don't have usedAsPrimary or quantities
      const almondMilkIngredient: Ingredient = {
        name: "almond milk",
        alternatives: new Set([0, 2]),
      };
      expect(result.ingredients[1]).toEqual(almondMilkIngredient);
      const soyMilkIngredient: Ingredient = {
        name: "soy milk",
        alternatives: new Set([0, 1]),
      };
      expect(result.ingredients[2]).toEqual(soyMilkIngredient);
      // Choices should be those by default
      expect(result.choices).toEqual({
        ingredientGroups: new Map([
          [
            "milk",
            [
              {
                displayName: "milk",
                index: 0,
                itemId: "ingredient-item-0",
                itemQuantity: {
                  scalable: true,
                  quantity: {
                    type: "fixed",
                    value: { type: "decimal", decimal: 200 },
                  },
                  unit: { name: "ml" },
                },
              },
              {
                displayName: "almond milk",
                index: 1,
                itemId: "ingredient-item-1",
                itemQuantity: {
                  scalable: true,
                  quantity: {
                    type: "fixed",
                    value: { type: "decimal", decimal: 100 },
                  },
                  unit: { name: "ml" },
                },
              },
              {
                displayName: "soy milk",
                index: 2,
                itemId: "ingredient-item-2",
                itemQuantity: {
                  scalable: true,
                  quantity: {
                    type: "fixed",
                    value: { type: "decimal", decimal: 150 },
                  },
                  unit: { name: "ml" },
                },
              },
            ],
          ],
        ]),
        ingredientItems: new Map(),
      });
      // The ingredient items should contain the right fields
      const firstIngredientItem = result.sections[0]?.content[0];
      if (firstIngredientItem?.type !== "step") return false;
      expect(firstIngredientItem.items[1]).toEqual({
        alternatives: [
          {
            displayName: "milk",
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
                name: "ml",
              },
              scalable: true,
            },
          },
        ],
        group: "milk",
        id: "ingredient-item-0",
        type: "ingredient",
      });
    });
  });

  describe("in-line alternative ingredients", () => {
    it("parses quantified in-line alternative ingredients correctly", () => {
      const result = new Recipe(recipeWithInlineAlternatives);
      expect(result.ingredients).toHaveLength(3);
      // Only the primary ingredient (milk) has quantities stored and usedAsPrimary flag
      const milkIngredient: Ingredient = {
        name: "milk",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 200 },
            },
            unit: "ml",
            alternatives: [
              {
                index: 1,
                quantities: [
                  {
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 100 },
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
                      value: { type: "decimal", decimal: 150 },
                    },
                    unit: "ml",
                  },
                ],
              },
            ],
          },
        ],
        alternatives: new Set([1, 2]),
        usedAsPrimary: true,
      };
      expect(result.ingredients[0]).toEqual(milkIngredient);
      // Alternative-only ingredients have no usedAsPrimary flag and no quantities
      const almondMilkIngredient: Ingredient = {
        name: "almond milk",
        alternatives: new Set([0, 2]),
      };
      expect(result.ingredients[1]).toEqual(almondMilkIngredient);
      const soyMilkIngredient: Ingredient = {
        name: "soy milk",
        alternatives: new Set([0, 1]),
      };
      expect(result.ingredients[2]).toEqual(soyMilkIngredient);

      // Choices should be those by default
      expect(result.choices).toEqual({
        ingredientItems: new Map([
          [
            "ingredient-item-0",
            [
              {
                displayName: "milk",
                index: 0,
                itemQuantity: {
                  scalable: true,
                  quantity: {
                    type: "fixed",
                    value: { type: "decimal", decimal: 200 },
                  },
                  unit: { name: "ml" },
                },
              },
              {
                displayName: "almond milk",
                index: 1,
                note: "vegan version",
                itemQuantity: {
                  scalable: true,
                  quantity: {
                    type: "fixed",
                    value: { type: "decimal", decimal: 100 },
                  },
                  unit: { name: "ml" },
                },
              },
              {
                displayName: "soy milk",
                index: 2,
                note: "another vegan option",
                itemQuantity: {
                  scalable: true,
                  quantity: {
                    type: "fixed",
                    value: { type: "decimal", decimal: 150 },
                  },
                  unit: { name: "ml" },
                },
              },
            ],
          ],
        ]),
        ingredientGroups: new Map(),
      });
    });

    it("parses unquantified in-line alternative ingredients correctly", () => {
      const recipe = "Add @sea salt{some}|fleur de sel{}";
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(2);
      const seaSaltIngredient: Ingredient = {
        name: "sea salt",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "text", text: "some" },
            },
            unit: undefined,
            alternatives: [
              {
                index: 1,
              },
            ],
          },
        ],
        alternatives: new Set([1]),
        usedAsPrimary: true,
      };
      expect(result.ingredients[0]).toEqual(seaSaltIngredient);
      const fleurDeSelIngredient: Ingredient = {
        name: "fleur de sel",
        alternatives: new Set([0]),
      };
      expect(result.ingredients[1]).toEqual(fleurDeSelIngredient);
    });

    it("should correctly show alternatives to ingredients subject of variants multiple times", () => {
      const recipe = `
        Use @sugar{100%g}|brown sugar{100%g}[for a richer flavor] in the mix.
        Then sprinkle some more @&sugar{50%g}|powder sugar{50%g} on top before serving.
      `;
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(3);
      // Sugar ingredient has two quantity entries with different alternatives (not merged)
      const sugarIngredient: Ingredient = {
        name: "sugar",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 100 },
            },
            unit: "g",
            alternatives: [
              {
                index: 1,
                quantities: [
                  {
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 100 },
                    },
                    unit: "g",
                  },
                ],
              },
            ],
          },
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 50 },
            },
            unit: "g",
            alternatives: [
              {
                index: 2,
                quantities: [
                  {
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 50 },
                    },
                    unit: "g",
                  },
                ],
              },
            ],
          },
        ],
        alternatives: new Set([1, 2]),
        usedAsPrimary: true,
      };
      expect(result.ingredients[0]).toEqual(sugarIngredient);

      const recipe2 = `
        Use @sugar{100%g}|brown sugar{100%g}[for a richer flavor] in the mix.
        Then sprinkle some more @&sugar{50%g}|powder sugar{50%g}|&brown sugar{50%g} on top before serving.
      `;
      const result2 = new Recipe(recipe2);
      expect(result2.ingredients).toHaveLength(3);
      // Sugar ingredient has two quantity entries with different alternatives (not merged)
      const sugarIngredient2: Ingredient = {
        name: "sugar",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 100 },
            },
            unit: "g",
            alternatives: [
              {
                index: 1,
                quantities: [
                  {
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 100 },
                    },
                    unit: "g",
                  },
                ],
              },
            ],
          },
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 50 },
            },
            unit: "g",
            alternatives: [
              {
                index: 2,
                quantities: [
                  {
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 50 },
                    },
                    unit: "g",
                  },
                ],
              },
              {
                index: 1,
                quantities: [
                  {
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 50 },
                    },
                    unit: "g",
                  },
                ],
              },
            ],
          },
        ],
        alternatives: new Set([1, 2]),
        usedAsPrimary: true,
      };
      expect(result2.ingredients[0]).toEqual(sugarIngredient2);
    });

    it("should correctly handle alternative ingredients without quantity", () => {
      const recipe = "Use @salt{}|pepper to spice things up";
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(2);
      const saltIngredient: Ingredient = {
        name: "salt",
        alternatives: new Set([1]),
        usedAsPrimary: true,
      };
      expect(result.ingredients[0]).toEqual(saltIngredient);
      const pepperIngredient: Ingredient = {
        name: "pepper",
        alternatives: new Set([0]),
      };
      expect(result.ingredients[1]).toEqual(pepperIngredient);
    });

    it("should correctly sum up sets of quantities with the same alternative that can't be summed up", () => {
      const recipe =
        "Add @aubergine{1}|carrot{1%large} and more this time @&aubergine{1}|&carrot{2%small}";
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(2);
      // Aubergine ingredient has quantities summed
      // Carrot alternative has incompatible units (large, small) so they're separate entries
      const aubergineIngredient: Ingredient = {
        name: "aubergine",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 2 },
            },
            unit: undefined,
            alternatives: [
              {
                index: 1,
                quantities: [
                  {
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 1 },
                    },
                    unit: "large",
                  },
                  {
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 2 },
                    },
                    unit: "small",
                  },
                ],
              },
            ],
          },
        ],
        usedAsPrimary: true,
        alternatives: new Set([1]),
      };
      expect(result.ingredients[0]).toEqual(aubergineIngredient);
    });

    it("should correctly sum up sets of quantities with their alternatives if the ingredients involved are the same", () => {
      const recipe = `
        Use @sugar{100%g}|brown sugar{100%g}|powder sugar{100%g}[for a richer flavor] in the mix.
        Then sprinkle some more @&sugar{50%g}|&powder sugar{30%g}|&brown sugar{20%g} on top before serving.
      `;
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(3);
      // Sugar ingredient has a single quantity entry with summed main quantity
      // Alternatives are also summed: brown sugar 100+20=120, powder sugar 100+30=130
      const sugarIngredient: Ingredient = {
        name: "sugar",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 150 },
            },
            unit: "g",
            alternatives: [
              {
                index: 1,
                quantities: [
                  {
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 120 },
                    },
                    unit: "g",
                  },
                ],
              },
              {
                index: 2,
                quantities: [
                  {
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 130 },
                    },
                    unit: "g",
                  },
                ],
              },
            ],
          },
        ],
        alternatives: new Set([1, 2]),
        usedAsPrimary: true,
      };
      expect(result.ingredients[0]).toEqual(sugarIngredient);
    });
  });

  describe("alternative units", () => {
    it("parses ingredients with alternative units correctly", () => {
      const recipe = "Add @flour{1%=bag|0.22%lb|3.5%oz}";
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0]).toEqual({
        name: "flour",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1 },
            },
            unit: "bag",
            equivalents: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 0.22 },
                },
                unit: "lb",
              },
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 3.5 },
                },
                unit: "oz",
              },
            ],
          },
        ],
        usedAsPrimary: true,
      });
      const ingredientItem = result.sections[0]?.content[0];
      if (ingredientItem?.type !== "step") return false;
      expect(ingredientItem.items[1]).toEqual({
        type: "ingredient",
        id: "ingredient-item-0",
        alternatives: [
          {
            displayName: "flour",
            index: 0,
            itemQuantity: {
              scalable: true,
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: { name: "bag", integerProtected: true },
              equivalents: [
                {
                  quantity: {
                    type: "fixed",
                    value: { type: "decimal", decimal: 0.22 },
                  },
                  unit: { name: "lb" },
                },
                {
                  quantity: {
                    type: "fixed",
                    value: { type: "decimal", decimal: 3.5 },
                  },
                  unit: { name: "oz" },
                },
              ],
            },
          },
        ],
      });
    });

    it("parses inline alternatives with alternative units correctly", () => {
      const recipe = "Use @flour{1%=bag|0.22%lb}|wheat flour{1%=bag|0.25%lb}";
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(2);
      const flourIngredient: Ingredient = {
        name: "flour",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1 },
            },
            unit: "bag",
            equivalents: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 0.22 },
                },
                unit: "lb",
              },
            ],
            alternatives: [
              {
                index: 1,
                quantities: [
                  {
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 1 },
                    },
                    unit: "bag",
                    equivalents: [
                      {
                        quantity: {
                          type: "fixed",
                          value: { type: "decimal", decimal: 0.25 },
                        },
                        unit: "lb",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        alternatives: new Set([1]),
        usedAsPrimary: true,
      };
      expect(result.ingredients[0]).toEqual(flourIngredient);
      const wheatFlourIngredient: Ingredient = {
        name: "wheat flour",
        alternatives: new Set([0]),
      };
      expect(result.ingredients[1]).toEqual(wheatFlourIngredient);
      const ingredientItem = result.sections[0]?.content[0];
      if (ingredientItem?.type !== "step") return false;
      const ingredientItem0: IngredientItem = {
        type: "ingredient",
        id: "ingredient-item-0",
        alternatives: [
          {
            displayName: "flour",
            index: 0,
            itemQuantity: {
              scalable: true,
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: { name: "bag", integerProtected: true },
              equivalents: [
                {
                  quantity: {
                    type: "fixed",
                    value: { type: "decimal", decimal: 0.22 },
                  },
                  unit: { name: "lb" },
                },
              ],
            },
          },
          {
            displayName: "wheat flour",
            index: 1,
            itemQuantity: {
              scalable: true,
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: { name: "bag", integerProtected: true },
              equivalents: [
                {
                  quantity: {
                    type: "fixed",
                    value: { type: "decimal", decimal: 0.25 },
                  },
                  unit: { name: "lb" },
                },
              ],
            },
          },
        ],
      };
      expect(ingredientItem.items[1]).toEqual(ingredientItem0);
    });

    it("parses grouped alternatives with alternative units correctly", () => {
      const recipe =
        "Add @|flour|wheat flour{1%=bag|0.22%lb} or @|flour|almond flour{1%=bag|0.25%lb}";
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(2);
      expect(result.choices.ingredientGroups.has("flour")).toBe(true);
      const ingredient0: Ingredient = {
        name: "wheat flour",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1 },
            },
            unit: "bag",
            equivalents: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 0.22 },
                },
                unit: "lb",
              },
            ],
            alternatives: [
              {
                index: 1,
                quantities: [
                  {
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 1 },
                    },
                    unit: "bag",
                    equivalents: [
                      {
                        quantity: {
                          type: "fixed",
                          value: { type: "decimal", decimal: 0.25 },
                        },
                        unit: "lb",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        alternatives: new Set([1]),
        usedAsPrimary: true,
      };
      expect(result.ingredients[0]).toEqual(ingredient0);
      const ingredientItem0: IngredientItem = {
        type: "ingredient",
        id: "ingredient-item-0",
        group: "flour",
        alternatives: [
          {
            index: 0,
            displayName: "wheat flour",
            itemQuantity: {
              scalable: true,
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: { name: "bag", integerProtected: true },
              equivalents: [
                {
                  quantity: {
                    type: "fixed",
                    value: { type: "decimal", decimal: 0.22 },
                  },
                  unit: { name: "lb" },
                },
              ],
            },
          },
        ],
      };
      const step = result.sections[0]?.content[0] as Step;
      expect(step.items[1]).toEqual(ingredientItem0);
    });

    it("parses additions of alternative units correctly", () => {
      const recipe = `
        Use @carrots{1%=large|1.5%cup} and @&carrots{2%=small|2%cup} and again @&carrots{1.5%cup}`;
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(1);
      const carrotIngredient: Ingredient = {
        name: "carrots",
        usedAsPrimary: true,
        quantities: [
          {
            and: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 2 },
                },
                unit: "large",
              },
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 2 },
                },
                unit: "small",
              },
            ],
            equivalents: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 5 },
                },
                unit: "cup",
              },
            ],
          },
        ],
      };
      expect(result.ingredients[0]).toEqual(carrotIngredient);
    });

    it("parses complex combinations of alterantive units and ingredients correctly", () => {
      const recipe = `
        Use @|flour-0|all-purpose flour{2%=bag|0.5%lb} or @|flour-0|whole wheat flour{1.5%=bag|0.4%lb}
        and add @&all-purpose flour{1%=bag|0.25%lb} once mixed to lighten the structure.
        Add another @|flour-1|&all-purpose flour{1%pinch} or @|flour-1|&whole wheat flour{1%pinch} just cause we're fancy`;
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(2);
      // Three separate quantity entries because:
      // - "bag" (integer-protected) can't be summed with "pinch" (incompatible units)
      // - "pinch" has no lb equivalent, so it can't share equivalents with bag
      expect(result.ingredients[0]).toEqual({
        alternatives: new Set([1]),
        name: "all-purpose flour",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 2 },
            },
            unit: "bag",
            equivalents: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 0.5 },
                },
                unit: "lb",
              },
            ],
            alternatives: [
              {
                index: 1,
                quantities: [
                  {
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 1.5 },
                    },
                    unit: "bag",
                    equivalents: [
                      {
                        quantity: {
                          type: "fixed",
                          value: { type: "decimal", decimal: 0.4 },
                        },
                        unit: "lb",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1 },
            },
            unit: "bag",
            equivalents: [
              {
                quantity: {
                  type: "fixed",
                  value: { type: "decimal", decimal: 0.25 },
                },
                unit: "lb",
              },
            ],
          },
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1 },
            },
            unit: "pinch",
            alternatives: [
              {
                index: 1,
                quantities: [
                  {
                    quantity: {
                      type: "fixed",
                      value: { type: "decimal", decimal: 1 },
                    },
                    unit: "pinch",
                  },
                ],
              },
            ],
          },
        ],
        usedAsPrimary: true,
      });
    });
  });

  describe("arbitrary scalable quantities", () => {
    it("parses arbitrary scalable quantities correctly", () => {
      const recipe = "{{2}} {{1.5%cup}} {{calory-factor:5}}";
      const result = new Recipe(recipe);
      expect(result.arbitraries).toHaveLength(3);
      expect(result.arbitraries[0]).toEqual({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 2 },
        },
      });
      expect(result.arbitraries[1]).toEqual({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 1.5 },
        },
        unit: "cup",
      });
      expect(result.arbitraries[2]).toEqual({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 5 },
        },
        name: "calory-factor",
      });
      const step = result.sections[0]?.content[0] as Step;
      expect(step.items[0]).toEqual({
        type: "arbitrary",
        index: 0,
      });
      expect(step.items[2]).toEqual({
        type: "arbitrary",
        index: 1,
      });
      expect(step.items[4]).toEqual({
        type: "arbitrary",
        index: 2,
      });
    });

    it("parses notes containing arbitrary scalable quantities correctly", () => {
      const recipe = `
        > This is a note with an arbitrary quantity {{3%tbsp}} inside
      `;
      const result = new Recipe(recipe);
      expect(result.arbitraries).toHaveLength(1);
      expect(result.arbitraries[0]).toEqual({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 3 },
        },
        unit: "tbsp",
      });
      const note = result.sections[0]?.content[0] as Note;
      expect(note).toEqual({
        type: "note",
        items: [
          { type: "text", value: "This is a note with an arbitrary quantity " },
          { type: "arbitrary", index: 0 },
          { type: "text", value: " inside" },
        ],
      });
    });

    it("throws an error if arbitrary scalable quantity has no numeric value", () => {
      const recipe = "{{calory-factor}}";
      expect(() => new Recipe(recipe)).toThrowError(InvalidQuantityFormat);
    });
  });

  describe("clone", () => {
    it("creates a deep clone of the recipe", () => {
      const recipe = new Recipe(recipeToScaleWithAlternatives);
      const recipeClone = recipe.clone();
      expect(recipeClone).toEqual(recipe);
      expect(recipeClone).not.toBe(recipe);
    });
  });
});
