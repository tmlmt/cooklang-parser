import { describe, it, expect } from "vitest";
import { Recipe } from "../src/classes/recipe";
import { simpleRecipe, complexRecipe } from "./fixtures/recipes";

describe("parse function", () => {
  it("parses basic metadata correctly", () => {
    const result = new Recipe(simpleRecipe);
    expect(result.metadata.title).toBe("Pancakes");
    expect(result.metadata.tags).toEqual(["breakfast", "easy"]);
  });

  it("extracts ingredients correctly", () => {
    const result = new Recipe(simpleRecipe);
    expect(result.ingredients.length).toBe(4);
    expect(result.ingredients).toEqual([
      {
        name: "eggs",
        optional: false,
        hidden: false,
        quantity: {
          type: "fixed",
          value: { type: "decimal", value: 3 },
        },
        unit: undefined,
        preparation: undefined,
        isRecipe: false,
      },
      {
        name: "flour",
        optional: false,
        hidden: false,
        quantity: undefined,
        unit: undefined,
        preparation: undefined,
        isRecipe: false,
      },
      {
        name: "coarse salt",
        hidden: false,
        isRecipe: false,
        optional: false,
        preparation: undefined,
        quantity: undefined,
        unit: undefined,
      },
      {
        name: "butter",
        optional: false,
        hidden: false,
        quantity: {
          type: "fixed",
          value: { type: "decimal", value: 50 },
        },
        unit: "g",
        preparation: undefined,
        isRecipe: false,
      },
    ]);
  });

  it("parses ingredients that are other recipes", () => {
    const recipe = `
      Defrost @@pizza dough{1} and form it into a nice disc
      And @@toppings on top
    `;
    const result = new Recipe(recipe);
    expect(result.ingredients).toHaveLength(2);
    expect(result.ingredients[0]).toEqual({
      name: "pizza dough",
      quantity: { type: "fixed", value: { type: "decimal", value: 1 } },
      unit: undefined,
      preparation: undefined,
      optional: false,
      hidden: false,
      isRecipe: true,
    });
    expect(result.ingredients[1]).toEqual({
      name: "toppings",
      quantity: undefined,
      unit: undefined,
      preparation: undefined,
      optional: false,
      hidden: false,
      isRecipe: true,
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
      quantity: { type: "fixed", value: { type: "decimal", value: 100 } },
      unit: "g",
      preparation: "sifted",
      optional: false,
      hidden: false,
      isRecipe: false,
    });
    expect(result.ingredients[1]).toEqual({
      name: "eggs",
      quantity: { type: "fixed", value: { type: "decimal", value: 2 } },
      unit: undefined,
      preparation: "large, beaten",
      optional: false,
      hidden: false,
      isRecipe: false,
    });
  });

  it("parses hidden and optional ingredients", () => {
    const recipe = `
      Add some @-salt{}.
      And maybe some @?pepper{}.
    `;
    const result = new Recipe(recipe);
    expect(result.ingredients).toHaveLength(2);
    expect(result.ingredients[0]).toEqual({
      name: "salt",
      hidden: true,
      optional: false,
      quantity: undefined,
      unit: undefined,
      preparation: undefined,
      isRecipe: false,
    });
    expect(result.ingredients[1]).toEqual({
      name: "pepper",
      hidden: false,
      optional: true,
      quantity: undefined,
      unit: undefined,
      preparation: undefined,
      isRecipe: false,
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
        quantity: { type: "fixed", value: { type: "decimal", value: 150 } },
        unit: "g",
        optional: false,
        hidden: false,
        preparation: undefined,
        isRecipe: false,
      });
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
        quantity: { type: "fixed", value: { type: "decimal", value: 100 } },
        unit: "g",
        optional: false,
        hidden: false,
        preparation: undefined,
        isRecipe: false,
      });
      expect(result.ingredients[1]).toEqual({
        name: "flour",
        quantity: { type: "fixed", value: { type: "decimal", value: 50 } },
        unit: "g",
        optional: false,
        hidden: false,
        preparation: undefined,
        isRecipe: false,
      });
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
        quantity: { type: "fixed", value: { type: "decimal", value: 150 } },
        unit: "g",
        optional: false,
        hidden: false,
        preparation: undefined,
        isRecipe: false,
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
        quantity: { type: "fixed", value: { type: "decimal", value: 1.5 } },
        unit: "kg",
        optional: false,
        hidden: false,
        preparation: undefined,
        isRecipe: false,
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
        value: { type: "decimal", value: 0.7 },
      });
      // TODO: 700g would be more elegant
    });

    it("should throw an error if referenced ingredient does not exist", () => {
      const recipe = `Add @&flour{100%g}.`;
      expect(() => new Recipe(recipe)).toThrow(
        /Referenced ingredient "flour" not found/,
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
        quantity: { type: "fixed", value: { type: "decimal", value: 1 } },
        unit: "l",
        hidden: false,
        isRecipe: false,
        optional: false,
        preparation: undefined,
      });
      expect(result.ingredients[1]).toEqual({
        name: "water",
        quantity: { type: "fixed", value: { type: "decimal", value: 1 } },
        unit: "kg",
        hidden: false,
        isRecipe: false,
        optional: false,
        preparation: undefined,
      });
    });
  });

  describe("cookware parsing", () => {
    it("extracts cookware correctly", () => {
      const result = new Recipe(simpleRecipe);
      expect(result.cookware.length).toBe(2);
      expect(result.cookware[0]).toEqual({
        hidden: false,
        name: "bowl",
        quantity: { type: "fixed", value: { type: "decimal", value: 1 } },
        optional: false,
      });
      expect(result.cookware[1]).toEqual({
        hidden: false,
        name: "pan",
        optional: false,
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
        optional: false,
        hidden: false,
      });
      expect(result.cookware[1]).toEqual({
        name: "pan",
        optional: true,
        hidden: false,
      });
      expect(result.cookware[2]).toEqual({
        name: "stove",
        optional: false,
        hidden: true,
      });
    });
  });

  it("extracts timers correctly", () => {
    const result = new Recipe(simpleRecipe);
    expect(result.timers.length).toBe(1);
    expect(result.timers[0]).toEqual({
      name: undefined,
      duration: { type: "fixed", value: { type: "decimal", value: 15 } },
      unit: "minutes",
    }); // Note: timer name may be empty based on regex
  });

  it("extracts steps correctly", () => {
    const result = new Recipe(simpleRecipe);
    expect(result.sections).toMatchSnapshot();
  });

  it("throws error for missing timer unit", () => {
    const badInput = "Cook for ~{15}";
    expect(() => new Recipe(badInput)).toThrow(/Timer missing units/);
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
