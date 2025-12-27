import { describe, it, expect } from "vitest";
import { Recipe } from "../src/classes/recipe";
import { simpleRecipe, complexRecipe } from "./fixtures/recipes";
import { ReferencedItemCannotBeRedefinedError } from "../src/errors";
import type { Ingredient } from "../src/types";

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
                  quantity: {
                    scalable: true,
                    equivalents: [
                      {
                        quantity: {
                          type: "fixed",
                          value: { type: "decimal", decimal: 3 },
                        },
                      },
                    ],
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
          quantityTotal: {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 3 } },
          },
        },
      ]);
    });

    it("extracts plain unquantified single-word ingredient correctly", () => {
      const result = new Recipe("@flour");
      expect(result.ingredients).toEqual([
        {
          name: "flour",
        },
      ]);
    });

    it("extracts plain unquantified multi-word ingredient correctly", () => {
      const result = new Recipe("@coarse salt{}");
      expect(result.ingredients).toEqual([
        {
          name: "coarse salt",
        },
      ]);
    });

    it("extracts single-word ingredient with quantity and unit correctly", () => {
      const result = new Recipe("@butter{30%g}");
      expect(result.ingredients).toEqual([
        {
          name: "butter",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 30 },
            },
            unit: "g",
          },
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
          quantityTotal: {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          },
          flags: ["recipe"],
          extras: {
            path: "pizza dough.cook",
          },
        };
        const expected_toppings: Ingredient = {
          name: "toppings",
          flags: ["recipe"],
          extras: {
            path: "toppings.cook",
          },
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
          quantityTotal: {
            quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          },
          flags: ["recipe"],
          extras: {
            path: "some essentials/my.doughs/pizza dough.cook",
          },
        };
        const expected_toppings: Ingredient = {
          name: "toppings",
          flags: ["recipe"],
          extras: {
            path: "../some-essentials/toppings.cook",
          },
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
        quantityTotal: {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
          unit: "g",
        },
        preparation: "sifted",
      });
      expect(result.ingredients[1]).toEqual({
        name: "eggs",
        quantityTotal: {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
        },
        preparation: "large, beaten",
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
      });
      expect(result.ingredients[1]).toEqual({
        name: "pepper",
        flags: ["optional"],
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
                  quantity: {
                    scalable: true,
                    equivalents: [
                      {
                        quantity: {
                          type: "fixed",
                          value: { type: "decimal", decimal: 100 },
                        },
                        unit: { name: "g" },
                      },
                    ],
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
                  quantity: {
                    scalable: true,
                    equivalents: [
                      {
                        quantity: {
                          type: "fixed",
                          value: { type: "decimal", decimal: 300 },
                        },
                        unit: { name: "mL" },
                      },
                    ],
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
                  quantity: {
                    scalable: true,
                    equivalents: [
                      {
                        quantity: {
                          type: "fixed",
                          value: { type: "decimal", decimal: 50 },
                        },
                        unit: { name: "g" },
                      },
                    ],
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
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 150 },
            },
            unit: "g",
          },
        },
        {
          name: "water",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 300 },
            },
            unit: "mL",
          },
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
      expect(result.ingredients[0]).toEqual({
        name: "flour",
        quantityTotal: {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 150 } },
          unit: "g",
        },
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
                  quantity: {
                    scalable: true,
                    equivalents: [
                      {
                        quantity: {
                          type: "fixed",
                          value: { type: "decimal", decimal: 100 },
                        },
                        unit: { name: "g" },
                      },
                    ],
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
                  quantity: {
                    scalable: true,
                    equivalents: [
                      {
                        quantity: {
                          type: "fixed",
                          value: { type: "decimal", decimal: 50 },
                        },
                        unit: { name: "g" },
                      },
                    ],
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
        quantityTotal: {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
          unit: "g",
        },
      });
      expect(result.ingredients[1]).toEqual({
        name: "flour",
        quantityTotal: {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 50 } },
          unit: "g",
        },
      });
    });

    it("should ignore preparation given for ingredient items referencing another one", () => {
      const result = new Recipe(`Mix @eggs{1}(boiled) and @&eggs{1}(poached)`);
      expect(result.ingredients).toEqual([
        {
          name: "eggs",
          preparation: "boiled",
          quantityTotal: {
            quantity: {
              type: "fixed",
              value: {
                type: "decimal",
                decimal: 2,
              },
            },
          },
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
                  quantity: {
                    scalable: true,
                    equivalents: [
                      {
                        quantity: {
                          type: "fixed",
                          value: { type: "decimal", decimal: 1 },
                        },
                      },
                    ],
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
                  quantity: {
                    scalable: true,
                    equivalents: [
                      {
                        quantity: {
                          type: "fixed",
                          value: { type: "decimal", decimal: 1 },
                        },
                      },
                    ],
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
        quantityTotal: {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 150 } },
          unit: "g",
        },
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
        quantityTotal: {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1.5 } },
          unit: "kg",
        },
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
      expect(butter.quantityTotal).toEqual({
        quantity: {
          type: "fixed",
          value: { type: "decimal", decimal: 0.704 },
        },
        unit: "kg",
      });
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
        quantityTotal: {
          type: "and",
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
        },
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
});
