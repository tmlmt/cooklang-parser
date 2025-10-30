import { describe, it, expect } from "vitest";
import { Recipe } from "../src/classes/recipe";
import { simpleRecipe, complexRecipe } from "./fixtures/recipes";
import { ReferencedItemCannotBeRedefinedError } from "../src/errors";

describe("parse function", () => {
  it("parses basic metadata correctly", () => {
    const result = new Recipe(simpleRecipe);
    expect(result.metadata.title).toBe("Pancakes");
    expect(result.metadata.tags).toEqual(["breakfast", "easy"]);
  });

  describe("ingredients with variants", () => {
    it("extracts ingredients correctly", () => {
      const result = new Recipe(simpleRecipe);
      expect(result.ingredients.length).toBe(4);
      expect(result.ingredients).toEqual([
        {
          name: "eggs",
          flags: [],
          quantity: {
            type: "fixed",
            amount: { type: "decimal", value: 3 },
          },
          quantityParts: [
            {
              quantity: {
                type: "fixed",
                amount: { type: "decimal", value: 3 },
              },
              unit: undefined,
              scalable: true,
            },
          ],
          unit: undefined,
          preparation: undefined,
        },
        {
          name: "flour",
          flags: [],
          quantity: undefined,
          unit: undefined,
          quantityParts: undefined,
          preparation: undefined,
        },
        {
          name: "coarse salt",
          flags: [],
          preparation: undefined,
          quantity: undefined,
          unit: undefined,
          quantityParts: undefined,
        },
        {
          name: "butter",
          flags: [],
          quantity: {
            type: "fixed",
            amount: { type: "decimal", value: 50 },
          },
          unit: "g",
          quantityParts: [
            {
              quantity: {
                type: "fixed",
                amount: { type: "decimal", value: 50 },
              },
              unit: "g",
              scalable: true,
            },
          ],
          preparation: undefined,
        },
      ]);
    });

    describe("parses ingredients that are other recipes", () => {
      it("parses a recipe in the same directory as the current recipe", () => {
        const recipe1 = `
          Defrost @@pizza dough{1} and form it into a nice disc
          And @@toppings on top
        `;
        const result1 = new Recipe(recipe1);

        const expected_dough = {
          name: "pizza dough",
          quantity: { type: "fixed", amount: { type: "decimal", value: 1 } },
          quantityParts: [
            {
              quantity: {
                type: "fixed",
                amount: { type: "decimal", value: 1 },
              },
              unit: undefined,
              scalable: true,
            },
          ],
          unit: undefined,
          preparation: undefined,
          flags: ["recipe"],
          extras: {
            path: "pizza dough.cook",
          },
        };
        const expected_toppings = {
          name: "toppings",
          quantity: undefined,
          unit: undefined,
          preparation: undefined,
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

        const expected_dough = {
          name: "pizza dough",
          quantity: { type: "fixed", amount: { type: "decimal", value: 1 } },
          quantityParts: [
            {
              quantity: {
                type: "fixed",
                amount: { type: "decimal", value: 1 },
              },
              unit: undefined,
              scalable: true,
            },
          ],
          unit: undefined,
          preparation: undefined,
          flags: ["recipe"],
          extras: {
            path: "some essentials/my.doughs/pizza dough.cook",
          },
        };
        const expected_toppings = {
          name: "toppings",
          quantity: undefined,
          unit: undefined,
          preparation: undefined,
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
        quantity: { type: "fixed", amount: { type: "decimal", value: 100 } },
        quantityParts: [
          {
            quantity: {
              type: "fixed",
              amount: { type: "decimal", value: 100 },
            },
            unit: "g",
            scalable: true,
          },
        ],
        unit: "g",
        preparation: "sifted",
        flags: [],
      });
      expect(result.ingredients[1]).toEqual({
        name: "eggs",
        quantity: { type: "fixed", amount: { type: "decimal", value: 2 } },
        unit: undefined,
        quantityParts: [
          {
            quantity: {
              type: "fixed",
              amount: { type: "decimal", value: 2 },
            },
            unit: undefined,
            scalable: true,
          },
        ],
        preparation: "large, beaten",
        flags: [],
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
        quantity: undefined,
        quantityParts: undefined,
        unit: undefined,
        preparation: undefined,
      });
      expect(result.ingredients[1]).toEqual({
        name: "pepper",
        flags: ["optional"],
        quantity: undefined,
        unit: undefined,
        preparation: undefined,
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
        quantity: undefined,
        quantityParts: undefined,
        unit: undefined,
        preparation: undefined,
      });
    });

    it("detects and correctly extracts ingredients aliases", () => {
      const recipe =
        new Recipe(`Mix @flour tipo 00|flour{100%g} with @water{300%mL}, 
    then add more @&flour tipo 00|flour{50%g}`);
      expect(recipe.ingredients).toEqual([
        {
          name: "flour tipo 00",
          quantity: { type: "fixed", amount: { type: "decimal", value: 150 } },
          quantityParts: [
            {
              quantity: {
                type: "fixed",
                amount: { type: "decimal", value: 100 },
              },
              unit: "g",
              scalable: true,
            },
            {
              quantity: {
                type: "fixed",
                amount: { type: "decimal", value: 50 },
              },
              unit: "g",
              scalable: true,
            },
          ],
          unit: "g",
          flags: [],
          preparation: undefined,
        },
        {
          name: "water",
          quantity: { type: "fixed", amount: { type: "decimal", value: 300 } },
          unit: "mL",
          quantityParts: [
            {
              quantity: {
                type: "fixed",
                amount: { type: "decimal", value: 300 },
              },
              unit: "mL",
              scalable: true,
            },
          ],
          flags: [],
          preparation: undefined,
        },
      ]);
      expect(recipe.sections[0]?.content).toEqual([
        {
          type: "step",
          items: [
            {
              type: "text",
              value: "Mix ",
            },
            {
              displayName: "flour",
              quantityPartIndex: 0,
              type: "ingredient",
              index: 0,
            },
            {
              type: "text",
              value: " with ",
            },
            {
              displayName: "water",
              quantityPartIndex: 0,
              type: "ingredient",
              index: 1,
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
              displayName: "flour",
              quantityPartIndex: 1,
              type: "ingredient",
              index: 0,
            },
          ],
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
        quantity: { type: "fixed", amount: { type: "decimal", value: 150 } },
        quantityParts: [
          {
            quantity: {
              type: "fixed",
              amount: { type: "decimal", value: 100 },
            },
            unit: "g",
            scalable: true,
          },
          {
            quantity: {
              type: "fixed",
              amount: { type: "decimal", value: 50 },
            },
            unit: "g",
            scalable: true,
          },
        ],
        unit: "g",
        preparation: undefined,
        flags: [],
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
              displayName: "flour",
              index: 0,
              quantityPartIndex: 0,
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
              quantityPartIndex: 1,
              type: "ingredient",
              displayName: "flour",
              index: 0,
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
        quantity: { type: "fixed", amount: { type: "decimal", value: 100 } },
        unit: "g",
        quantityParts: [
          {
            quantity: {
              type: "fixed",
              amount: { type: "decimal", value: 100 },
            },
            unit: "g",
            scalable: true,
          },
        ],
        flags: [],
        preparation: undefined,
      });
      expect(result.ingredients[1]).toEqual({
        name: "flour",
        quantity: { type: "fixed", amount: { type: "decimal", value: 50 } },
        unit: "g",
        quantityParts: [
          {
            quantity: {
              type: "fixed",
              amount: { type: "decimal", value: 50 },
            },
            unit: "g",
            scalable: true,
          },
        ],
        flags: [],
        preparation: undefined,
      });
    });

    it("should ignore preparation given for ingredient items referencing another one", () => {
      const result = new Recipe(`Mix @eggs{1}(boiled) and @&eggs{1}(poached)`);
      expect(result.ingredients).toEqual([
        {
          name: "eggs",
          flags: [],
          preparation: "boiled",
          quantity: {
            type: "fixed",
            amount: {
              type: "decimal",
              value: 2,
            },
          },
          unit: undefined,
          quantityParts: [
            {
              quantity: {
                type: "fixed",
                amount: { type: "decimal", value: 1 },
              },
              unit: undefined,
              scalable: true,
            },
            {
              quantity: {
                type: "fixed",
                amount: { type: "decimal", value: 1 },
              },
              unit: undefined,
              scalable: true,
            },
          ],
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
              quantityPartIndex: 0,
              type: "ingredient",
              displayName: "eggs",
              index: 0,
            },
            {
              type: "text",
              value: " and ",
            },
            {
              quantityPartIndex: 1,
              type: "ingredient",
              displayName: "eggs",
              index: 0,
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
        quantity: { type: "fixed", amount: { type: "decimal", value: 150 } },
        unit: "g",
        quantityParts: [
          {
            quantity: {
              type: "fixed",
              amount: { type: "decimal", value: 100 },
            },
            unit: "g",
            scalable: true,
          },
          {
            quantity: {
              type: "fixed",
              amount: { type: "decimal", value: 50 },
            },
            unit: "g",
            scalable: true,
          },
        ],
        flags: [],
        preparation: undefined,
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
        quantity: { type: "fixed", amount: { type: "decimal", value: 1.5 } },
        unit: "kg",
        quantityParts: [
          {
            quantity: {
              type: "fixed",
              amount: { type: "decimal", value: 500 },
            },
            unit: "g",
            scalable: true,
          },
          {
            quantity: {
              type: "fixed",
              amount: { type: "decimal", value: 1 },
            },
            unit: "kg",
            scalable: true,
          },
        ],
        flags: [],
        preparation: undefined,
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
      expect(butter.unit).toBe("kg"); // largest metric mass unit
      expect(butter.quantity).toEqual({
        type: "fixed",
        amount: { type: "decimal", value: 0.7 },
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

    it("adds a referenced ingredient as a new ingredient when units are incompatible", () => {
      const recipe = `
        Add @water{1%l}.
        Then add some more @&water{1%kg}.
      `;
      const result = new Recipe(recipe);
      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0]).toEqual({
        name: "water",
        quantity: { type: "fixed", amount: { type: "decimal", value: 1 } },
        unit: "l",
        quantityParts: [
          {
            quantity: {
              type: "fixed",
              amount: { type: "decimal", value: 1 },
            },
            unit: "l",
            scalable: true,
          },
        ],
        flags: [],
        preparation: undefined,
      });
      expect(result.ingredients[1]).toEqual({
        name: "water",
        quantity: { type: "fixed", amount: { type: "decimal", value: 1 } },
        unit: "kg",
        quantityParts: [
          {
            quantity: {
              type: "fixed",
              amount: { type: "decimal", value: 1 },
            },
            unit: "kg",
            scalable: true,
          },
        ],
        flags: [],
        preparation: undefined,
      });
    });
  });

  describe("cookware parsing", () => {
    it("extracts cookware correctly", () => {
      const result = new Recipe(simpleRecipe);
      expect(result.cookware.length).toBe(2);
      expect(result.cookware[0]).toEqual({
        name: "bowl",
        quantity: { type: "fixed", amount: { type: "decimal", value: 1 } },
        quantityParts: [
          { type: "fixed", amount: { type: "decimal", value: 1 } },
        ],
        flags: [],
      });
      expect(result.cookware[1]).toEqual({
        name: "pan",
        flags: [],
      });
    });

    it("should correctly track and sum quantities of referenced cookware", () => {
      const recipe = `
        Use #bowl{1} and again #&bowl{2}
      `;
      const result = new Recipe(recipe);
      expect(result.cookware).toHaveLength(1);
      expect(result.cookware[0]!.quantity).toEqual({
        type: "fixed",
        amount: { type: "decimal", value: 3 },
      });
      expect(result.cookware[0]!.quantityParts).toEqual([
        {
          type: "fixed",
          amount: { type: "decimal", value: 1 },
        },
        {
          type: "fixed",
          amount: { type: "decimal", value: 2 },
        },
      ]);
    });

    it("should correctly handle modifiers for cookware", () => {
      const recipe = `
        Use an #oven or a #?pan to cook. Clean the #&oven after use. Don't bother using a #-stove
      `;
      const result = new Recipe(recipe);
      expect(result.cookware).toHaveLength(3);
      expect(result.cookware[0]).toEqual({
        name: "oven",
        flags: [],
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
      name: undefined,
      duration: { type: "fixed", amount: { type: "decimal", value: 15 } },
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
