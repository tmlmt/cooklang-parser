import { describe, it, expect } from "vitest";
import { Recipe } from "../src/classes/recipe";
import type { Step } from "../src/types";

// ============================================================================
// Test Fixtures
// ============================================================================

const recipeWithStepVariants = `
---
servings: 1
---
Preheat the oven to 180°C.

[vegan] Use @flax eggs{2%tbsp} instead of regular eggs.

[*] Crack the @eggs{2} into a bowl.

Mix @flour{200%g} and @sugar{50%g}.
`;

const recipeWithSectionVariants = `
---
servings: 1
---
= Base

Mix @flour{200%g} and @water{100%ml}.

= [vegan] Vegan Topping

Spread @tofu{100%g} on top.

= [*] Classic Topping

Spread @cheese{100%g} on top.
`;

const recipeWithMultipleVariantStep = `
---
servings: 1
---
Prepare the base with @flour{200%g}.

[vegan,vegetarian] Add @tofu{100%g} for protein.

Mix well.
`;

const recipeWithOptionalStep = `
---
servings: 1
---
Mix @flour{200%g}.

[?vegan] Optionally add @nutritional yeast{2%tbsp} for a cheesy flavor.

Bake for 30 minutes.
`;

const recipeWithVariantsMetadata = `
---
servings: 1
variants: [default, vegan, gluten-free]
---
Mix @flour{200%g}.
`;

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

const recipeWithDiscoveredAndMetaVariants = `
---
servings: 1
variants: [low-carb]
---
[vegan] Use @tofu{100%g}.

Prepare @rice{200%g}.
`;

const recipeWithStepOnlyVariantTag = `
---
servings: 1
---
[vegan]
Use @tofu{100%g} for the filling.
`;

const recipeWithSectionAndStepVariants = `
---
servings: 1
---
= [vegan] Plant-based Additions

[vegetarian] Mix @paneer{100%g} with spices.

Add @tofu{50%g} to the mix.

= Regular Version

Add @chicken{200%g}.
`;

const recipeWithVariantLinkedChoices = `
---
servings: 1
---
[*] Add @milk{200%ml}|oat milk{200%ml}.

[vegan] Add @water{100%ml}|broth{100%ml}[for vegan].

[*] Use @|protein|chicken{200%g} or @|protein|turkey{200%g}.

[vegan] Use @|protein|tofu{200%g}[for vegan] or @|protein|tempeh{200%g}[for vegan].
`;

const recipeWithUniversalOptionalStep = `
---
servings: 1
---
Mix @flour{200%g}.

[?] Whisk in @|eggs|eggs{2%large} that you can also replace by @|eggs/alt|flax eggs{2} and @|eggs/alt|salt{1%pinch}.

Bake for 30 minutes.
`;

const recipeWithOptionalSection = `
---
servings: 1
---
= Main

Mix @flour{200%g} and @water{100%ml}.

= [?] Garnish

Top with @sesame seeds{1%tbsp} and @chives{1%tbsp}.
`;

const recipeWithOptionalVariantSection = `
---
servings: 1
---
= Main

Mix @flour{200%g}.

= [?vegan] Vegan Extras

Add @nutritional yeast{2%tbsp}.

= [*] Classic Extras

Add @parmesan{50%g}.
`;

// ============================================================================
// Parsing Tests
// ============================================================================

describe("recipe variants", () => {
  describe("parsing", () => {
    it("parses step variant tags", () => {
      const recipe = new Recipe(recipeWithStepVariants);

      const steps = recipe.sections[0]!.content.filter(
        (item): item is Step => item.type === "step",
      );

      // Step 0: no tag
      expect(steps[0]!.variants).toBeUndefined();
      expect(steps[0]!.optional).toBeUndefined();

      // Step 1: [vegan]
      expect(steps[1]!.variants).toEqual(["vegan"]);
      expect(steps[1]!.optional).toBeUndefined();

      // Step 2: [*]
      expect(steps[2]!.variants).toEqual(["*"]);

      // Step 3: no tag
      expect(steps[3]!.variants).toBeUndefined();
    });

    it("parses section variant tags", () => {
      const recipe = new Recipe(recipeWithSectionVariants);

      expect(recipe.sections).toHaveLength(3);

      // Section 0: "Base" - no variants
      expect(recipe.sections[0]!.name).toBe("Base");
      expect(recipe.sections[0]!.variants).toBeUndefined();

      // Section 1: "[vegan] Vegan Topping"
      expect(recipe.sections[1]!.name).toBe("Vegan Topping");
      expect(recipe.sections[1]!.variants).toEqual(["vegan"]);

      // Section 2: "[*] Classic Topping"
      expect(recipe.sections[2]!.name).toBe("Classic Topping");
      expect(recipe.sections[2]!.variants).toEqual(["*"]);
    });

    it("parses [?] section as optional with no variant restriction", () => {
      const recipe = new Recipe(recipeWithOptionalSection);

      expect(recipe.sections).toHaveLength(2);

      // Section 0: "Main" - not optional
      expect(recipe.sections[0]!.name).toBe("Main");
      expect(recipe.sections[0]!.optional).toBeUndefined();
      expect(recipe.sections[0]!.variants).toBeUndefined();

      // Section 1: "[?] Garnish" - optional, no variant restriction
      expect(recipe.sections[1]!.name).toBe("Garnish");
      expect(recipe.sections[1]!.optional).toBe(true);
      expect(recipe.sections[1]!.variants).toBeUndefined();
    });

    it("parses [?vegan] section as optional with variant restriction", () => {
      const recipe = new Recipe(recipeWithOptionalVariantSection);

      // Section 1: "[?vegan] Vegan Extras" - optional + variant
      expect(recipe.sections[1]!.name).toBe("Vegan Extras");
      expect(recipe.sections[1]!.optional).toBe(true);
      expect(recipe.sections[1]!.variants).toEqual(["vegan"]);
    });

    it("parses multiple variant names on a step", () => {
      const recipe = new Recipe(recipeWithMultipleVariantStep);

      const steps = recipe.sections[0]!.content.filter(
        (item): item is Step => item.type === "step",
      );

      expect(steps[1]!.variants).toEqual(["vegan", "vegetarian"]);
    });

    it("parses optional step tag [?variant]", () => {
      const recipe = new Recipe(recipeWithOptionalStep);

      const steps = recipe.sections[0]!.content.filter(
        (item): item is Step => item.type === "step",
      );

      expect(steps[1]!.variants).toEqual(["vegan"]);
      expect(steps[1]!.optional).toBe(true);
    });

    it("parses variant tag on a standalone line before step content", () => {
      const recipe = new Recipe(recipeWithStepOnlyVariantTag);

      const steps = recipe.sections[0]!.content.filter(
        (item): item is Step => item.type === "step",
      );

      // The [vegan] tag and the next line should form one step
      expect(steps).toHaveLength(1);
      expect(steps[0]!.variants).toEqual(["vegan"]);
      // The step content should be "Use @tofu..."
      expect(steps[0]!.items.length).toBeGreaterThan(0);
    });

    it("parses [?] as optional for all variants with no variant restriction", () => {
      const recipe = new Recipe(recipeWithUniversalOptionalStep);

      const steps = recipe.sections[0]!.content.filter(
        (item): item is Step => item.type === "step",
      );

      // Step 1: "[?] Whisk in..." - optional for all variants, no variant restriction
      expect(steps[1]!.optional).toBe(true);
      expect(steps[1]!.variants).toBeUndefined();

      // The text should NOT include the "[?] " prefix
      const firstTextItem = steps[1]!.items[0]!;
      expect(firstTextItem.type).toBe("text");
      expect((firstTextItem as { value: string }).value).toBe("Whisk in ");

      // Ingredients should be parsed correctly
      const ingredientItems = steps[1]!.items.filter(
        (item) => item.type === "ingredient",
      );
      expect(ingredientItems).toHaveLength(3);
    });

    it("does not add [?] to discoveredVariants", () => {
      const recipe = new Recipe(recipeWithUniversalOptionalStep);

      // "?" should NOT appear as a variant name
      expect(recipe.choices.variants).not.toContain("?");
    });

    it("populates choices.variants from metadata", () => {
      const recipe = new Recipe(recipeWithVariantsMetadata);

      expect(recipe.choices.variants).toEqual(
        expect.arrayContaining(["default", "vegan", "gluten-free"]),
      );
      expect(recipe.choices.variants).toHaveLength(3);
    });

    it("populates choices.variants from discovered tags", () => {
      const recipe = new Recipe(recipeWithStepVariants);

      expect(recipe.choices.variants).toEqual(
        expect.arrayContaining(["vegan", "*"]),
      );
      expect(recipe.choices.variants).toHaveLength(2);
    });

    it("merges metadata and discovered variants", () => {
      const recipe = new Recipe(recipeWithDiscoveredAndMetaVariants);

      expect(recipe.choices.variants).toEqual(
        expect.arrayContaining(["low-carb", "vegan"]),
      );
      expect(recipe.choices.variants).toHaveLength(2);
    });

    it("parses note on grouped alternative ingredients", () => {
      const recipe = new Recipe(recipeWithGroupedNoteAutoSelection);

      const subgroups = recipe.choices.ingredientGroups.get("protein");
      expect(subgroups).toBeDefined();
      expect(subgroups).toHaveLength(3);

      // First subgroup (chicken) - no note
      expect(subgroups![0]![0]!.note).toBeUndefined();

      // Second subgroup (tofu) - has note
      expect(subgroups![1]![0]!.note).toBe("for a vegan version");

      // Third subgroup (tempeh) - has note
      expect(subgroups![2]![0]!.note).toBe("also vegan");
    });

    it("stores linked variants on parsed alternatives", () => {
      const recipe = new Recipe(recipeWithVariantLinkedChoices);

      const defaultInline =
        recipe.choices.ingredientItems.get("ingredient-item-0");
      const veganInline =
        recipe.choices.ingredientItems.get("ingredient-item-1");
      expect(defaultInline).toBeDefined();
      expect(veganInline).toBeDefined();
      expect(defaultInline![0]!.linkedVariants).toEqual(["*"]);
      expect(veganInline![0]!.linkedVariants).toEqual(["vegan"]);

      const protein = recipe.choices.ingredientGroups.get("protein");
      expect(protein).toBeDefined();
      expect(protein).toHaveLength(4);
      expect(protein![0]![0]!.linkedVariants).toEqual(["*"]);
      expect(protein![2]![0]!.linkedVariants).toEqual(["vegan"]);
    });

    it("filters choices by variant with getChoicesForVariant", () => {
      const recipe = new Recipe(recipeWithVariantLinkedChoices);

      const defaultChoices = recipe.getChoicesForVariant();
      expect(defaultChoices.ingredientItems.has("ingredient-item-0")).toBe(
        true,
      );
      expect(defaultChoices.ingredientItems.has("ingredient-item-1")).toBe(
        false,
      );
      expect(defaultChoices.ingredientGroups.get("protein")).toHaveLength(2);

      const veganChoices = recipe.getChoicesForVariant("vegan");
      expect(veganChoices.ingredientItems.has("ingredient-item-0")).toBe(false);
      expect(veganChoices.ingredientItems.has("ingredient-item-1")).toBe(true);
      expect(veganChoices.ingredientGroups.get("protein")).toHaveLength(2);
      expect(
        veganChoices.ingredientGroups
          .get("protein")!
          .flat()
          .every((alt) => alt.linkedVariants?.includes("vegan")),
      ).toBe(true);
    });
  });

  // ============================================================================
  // collectQuantityGroups / getIngredientQuantities - Variant Filtering Tests
  // ============================================================================

  describe("variant-aware quantity collection", () => {
    describe("section filtering", () => {
      it("includes all sections when no variant is selected", () => {
        const recipe = new Recipe(recipeWithSectionVariants);
        // Default: returns ingredients from non-tagged sections only
        const ingredients = recipe.getIngredientQuantities();

        // flour+water from "Base", cheese from "[*] Classic Topping" (default)
        // tofu from "[vegan] Vegan Topping" should be excluded
        const names = ingredients
          .filter((i) => i.usedAsPrimary)
          .map((i) => i.name);
        expect(names).toContain("flour");
        expect(names).toContain("water");
        expect(names).toContain("cheese");
        expect(names).not.toContain("tofu");
      });

      it("filters sections when a named variant is selected", () => {
        const recipe = new Recipe(recipeWithSectionVariants);
        const ingredients = recipe.getIngredientQuantities({
          choices: { variant: "vegan" },
        });

        // flour+water from "Base" (no tag = always active), tofu from "[vegan]" section
        const names = ingredients
          .filter((i) => i.usedAsPrimary)
          .map((i) => i.name);
        expect(names).toContain("flour");
        expect(names).toContain("water");
        expect(names).toContain("tofu");
        // cheese from "[*]" section should be excluded
        expect(names).not.toContain("cheese");
      });
    });

    describe("step filtering", () => {
      it("includes all non-tagged steps and [*] steps when no variant is selected", () => {
        const recipe = new Recipe(recipeWithStepVariants);
        const ingredients = recipe.getIngredientQuantities();

        const names = ingredients
          .filter((i) => i.usedAsPrimary)
          .map((i) => i.name);
        // eggs from [*] step and flour, sugar from untagged steps
        expect(names).toContain("eggs");
        expect(names).toContain("flour");
        expect(names).toContain("sugar");
        // flax eggs from [vegan] step should be excluded
        expect(names).not.toContain("flax eggs");
      });

      it("filters steps when a named variant is selected", () => {
        const recipe = new Recipe(recipeWithStepVariants);
        const ingredients = recipe.getIngredientQuantities({
          choices: { variant: "vegan" },
        });

        const names = ingredients
          .filter((i) => i.usedAsPrimary)
          .map((i) => i.name);
        // flax eggs from [vegan] step, flour and sugar from untagged steps
        expect(names).toContain("flax eggs");
        expect(names).toContain("flour");
        expect(names).toContain("sugar");
        // eggs from [*] step should be excluded
        expect(names).not.toContain("eggs");
      });

      it("handles steps tagged with multiple variants", () => {
        const recipe = new Recipe(recipeWithMultipleVariantStep);
        const ingredients = recipe.getIngredientQuantities({
          choices: { variant: "vegetarian" },
        });

        const names = ingredients
          .filter((i) => i.usedAsPrimary)
          .map((i) => i.name);
        // tofu from [vegan,vegetarian] step should be included for "vegetarian"
        expect(names).toContain("tofu");
        expect(names).toContain("flour");
      });
    });

    describe("optional step handling", () => {
      it("adds optional flag to ingredients from [?variant] steps", () => {
        const recipe = new Recipe(recipeWithOptionalStep);
        const ingredients = recipe.getIngredientQuantities({
          choices: { variant: "vegan" },
        });

        const yeast = ingredients.find((i) => i.name === "nutritional yeast");
        expect(yeast).toBeDefined();
        expect(yeast!.usedAsPrimary).toBe(true);
        expect(yeast!.flags).toContain("optional");
      });

      it("does not add optional flag when no variant matches the optional step", () => {
        const recipe = new Recipe(recipeWithOptionalStep);
        // Default variant: [?vegan] step should be excluded entirely
        const ingredients = recipe.getIngredientQuantities();

        const names = ingredients.map((i) => i.name);
        expect(names).not.toContain("nutritional yeast");
      });

      it("does not duplicate optional flag when ingredient already has it", () => {
        // Test with a recipe where the ingredient itself is marked optional
        const recipe = new Recipe(`
[?vegan] Add @?nutritional yeast{1%tbsp}.
`);
        const ingredients = recipe.getIngredientQuantities({
          choices: { variant: "vegan" },
        });

        const yeast = ingredients.find((i) => i.name === "nutritional yeast");
        expect(yeast).toBeDefined();
        // Should only have "optional" once
        expect(yeast!.flags!.filter((f) => f === "optional")).toHaveLength(1);
      });

      it("adds optional flag to ingredients from [?] steps (optional for all variants)", () => {
        const recipe = new Recipe(recipeWithUniversalOptionalStep);

        // With default variant: [?] step is active and ingredients are optional
        const ingredients = recipe.getIngredientQuantities();
        const eggs = ingredients.find((i) => i.name === "eggs");
        expect(eggs).toBeDefined();
        expect(eggs!.usedAsPrimary).toBe(true);
        expect(eggs!.flags).toContain("optional");
      });

      it("adds optional flag from [?] steps regardless of which variant is selected", () => {
        const recipe = new Recipe(recipeWithUniversalOptionalStep);

        // With a named variant: [?] step is still active and ingredients are optional
        const ingredients = recipe.getIngredientQuantities({
          choices: { variant: "vegan" },
        });
        const eggs = ingredients.find((i) => i.name === "eggs");
        expect(eggs).toBeDefined();
        expect(eggs!.usedAsPrimary).toBe(true);
        expect(eggs!.flags).toContain("optional");
      });

      it("adds optional flag to all ingredients from a [?] section", () => {
        const recipe = new Recipe(recipeWithOptionalSection);
        const ingredients = recipe.getIngredientQuantities();

        // Ingredients from the optional "Garnish" section
        const sesame = ingredients.find((i) => i.name === "sesame seeds");
        expect(sesame).toBeDefined();
        expect(sesame!.usedAsPrimary).toBe(true);
        expect(sesame!.flags).toContain("optional");

        const chives = ingredients.find((i) => i.name === "chives");
        expect(chives).toBeDefined();
        expect(chives!.flags).toContain("optional");

        // Ingredients from the non-optional "Main" section should NOT be optional
        const flour = ingredients.find((i) => i.name === "flour");
        expect(flour).toBeDefined();
        expect(flour!.flags).toBeUndefined();
      });

      it("adds optional flag from [?vegan] section only when that variant is active", () => {
        const recipe = new Recipe(recipeWithOptionalVariantSection);

        // With "vegan" variant: [?vegan] section is active and ingredients are optional
        const veganIngredients = recipe.getIngredientQuantities({
          choices: { variant: "vegan" },
        });
        const yeast = veganIngredients.find(
          (i) => i.name === "nutritional yeast",
        );
        expect(yeast).toBeDefined();
        expect(yeast!.usedAsPrimary).toBe(true);
        expect(yeast!.flags).toContain("optional");

        // With default variant: [?vegan] section is excluded entirely
        const defaultIngredients = recipe.getIngredientQuantities();
        const defaultNames = defaultIngredients.map((i) => i.name);
        expect(defaultNames).not.toContain("nutritional yeast");
      });
    });

    describe("note-based auto-selection (inline)", () => {
      it("auto-selects inline alternative whose note matches the variant", () => {
        const recipe = new Recipe(recipeWithNoteAutoSelection);
        const ingredients = recipe.getIngredientQuantities({
          choices: { variant: "vegan" },
        });

        // "oat milk" (note: "for a vegan version") should be auto-selected as primary
        const oatMilk = ingredients.find((i) => i.name === "oat milk");
        expect(oatMilk).toBeDefined();
        expect(oatMilk!.usedAsPrimary).toBe(true);
        expect(oatMilk!.quantities).toBeDefined();
        expect(oatMilk!.quantities!.length).toBeGreaterThan(0);

        // "milk" should not be primary
        const milk = ingredients.find((i) => i.name === "milk");
        expect(milk).toBeDefined();
        expect(milk!.usedAsPrimary).toBeUndefined();
      });

      it("uses default selection when no note matches", () => {
        const recipe = new Recipe(recipeWithNoteAutoSelection);
        const ingredients = recipe.getIngredientQuantities({
          choices: { variant: "gluten-free" },
        });

        // No note matches "gluten-free", so first alternative (milk) should be primary
        const milk = ingredients.find((i) => i.name === "milk");
        expect(milk).toBeDefined();
        expect(milk!.usedAsPrimary).toBe(true);
        expect(milk!.quantities).toBeDefined();
      });
    });

    describe("note-based auto-selection (grouped)", () => {
      it("auto-selects grouped alternative subgroup whose note matches the variant", () => {
        const recipe = new Recipe(recipeWithGroupedNoteAutoSelection);
        const ingredients = recipe.getIngredientQuantities({
          choices: { variant: "vegan" },
        });

        // "tofu" (note: "for a vegan version") should be auto-selected as primary
        const tofu = ingredients.find((i) => i.name === "tofu");
        expect(tofu).toBeDefined();
        expect(tofu!.usedAsPrimary).toBe(true);
        expect(tofu!.quantities).toBeDefined();

        // "chicken" should not be primary
        const chicken = ingredients.find((i) => i.name === "chicken");
        expect(chicken).toBeDefined();
        expect(chicken!.usedAsPrimary).toBeUndefined();
      });

      it("uses default selection when no grouped note matches", () => {
        const recipe = new Recipe(recipeWithGroupedNoteAutoSelection);
        const ingredients = recipe.getIngredientQuantities({
          choices: { variant: "gluten-free" },
        });

        // No note matches "gluten-free", so first subgroup (chicken) should be primary
        const chicken = ingredients.find((i) => i.name === "chicken");
        expect(chicken).toBeDefined();
        expect(chicken!.usedAsPrimary).toBe(true);
        expect(chicken!.quantities).toBeDefined();
      });
    });

    describe("combined section and step filtering", () => {
      it("filters both section and step variants", () => {
        const recipe = new Recipe(recipeWithSectionAndStepVariants);

        // For "vegan" variant: the [vegan] section is active,
        // but the [vegetarian] step inside it is not
        const ingredients = recipe.getIngredientQuantities({
          choices: { variant: "vegan" },
        });

        const names = ingredients
          .filter((i) => i.usedAsPrimary)
          .map((i) => i.name);
        // tofu is in an untagged step within [vegan] section
        expect(names).toContain("tofu");
        // paneer is in [vegetarian] step within [vegan] section - excluded
        expect(names).not.toContain("paneer");
        // chicken is in untagged "Regular Version" section - included
        expect(names).toContain("chicken");
      });
    });

    describe("getRawQuantityGroups variant filtering", () => {
      it("respects variant in getRawQuantityGroups", () => {
        const recipe = new Recipe(recipeWithStepVariants);
        const groups = recipe.getRawQuantityGroups({
          choices: { variant: "vegan" },
        });

        const names = groups.filter((g) => g.usedAsPrimary).map((g) => g.name);
        expect(names).toContain("flax eggs");
        expect(names).not.toContain("eggs");
      });

      it("adds optional flag in getRawQuantityGroups for optional steps", () => {
        const recipe = new Recipe(recipeWithOptionalStep);
        const groups = recipe.getRawQuantityGroups({
          choices: { variant: "vegan" },
        });

        const yeast = groups.find((g) => g.name === "nutritional yeast");
        expect(yeast).toBeDefined();
        expect(yeast!.flags).toContain("optional");
      });
    });

    describe("getCookwareForVariant", () => {
      const recipeWithVariantCookware = `
---
servings: 1
variants: vegan
---
= Base

Mix @flour{200%g} in a #bowl{}.

= [vegan] Vegan Prep

Blend @tofu{100%g} in a #blender{}.

= [*] Classic Prep

Whisk @eggs{2} with a #whisk{}.
`;

      const recipeWithStepVariantCookware = `
---
servings: 1
variants: vegan
---
Preheat the #oven{}.

[vegan] Use a #steamer{} for the vegetables.

[*] Use a #grill{} for the meat.

Serve on a #plate{}.
`;

      it("returns all non-hidden cookware for default variant", () => {
        const recipe = new Recipe(recipeWithVariantCookware);
        const cookware = recipe.getCookwareForVariant();
        const names = cookware.map((cw) => cw.name);
        expect(names).toContain("bowl");
        expect(names).toContain("whisk");
        expect(names).not.toContain("blender");
      });

      it("filters cookware by named variant in sections", () => {
        const recipe = new Recipe(recipeWithVariantCookware);
        const cookware = recipe.getCookwareForVariant({
          choices: { variant: "vegan" },
        });
        const names = cookware.map((cw) => cw.name);
        expect(names).toContain("bowl");
        expect(names).toContain("blender");
        expect(names).not.toContain("whisk");
      });

      it("filters cookware by named variant in steps", () => {
        const recipe = new Recipe(recipeWithStepVariantCookware);
        const cookware = recipe.getCookwareForVariant({
          choices: { variant: "vegan" },
        });
        const names = cookware.map((cw) => cw.name);
        expect(names).toContain("oven");
        expect(names).toContain("steamer");
        expect(names).toContain("plate");
        expect(names).not.toContain("grill");
      });

      it("returns default-variant cookware when no choices provided", () => {
        const recipe = new Recipe(recipeWithStepVariantCookware);
        const cookware = recipe.getCookwareForVariant();
        const names = cookware.map((cw) => cw.name);
        expect(names).toContain("oven");
        expect(names).toContain("grill");
        expect(names).toContain("plate");
        expect(names).not.toContain("steamer");
      });

      it("returns cookware for * variant explicitly", () => {
        const recipe = new Recipe(recipeWithStepVariantCookware);
        const cookware = recipe.getCookwareForVariant({
          choices: { variant: "*" },
        });
        const names = cookware.map((cw) => cw.name);
        expect(names).toContain("oven");
        expect(names).toContain("grill");
        expect(names).toContain("plate");
        expect(names).not.toContain("steamer");
      });
    });
  });
});
