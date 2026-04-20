import { describe, it, expect } from "vitest";
import { ShoppingList } from "../src/classes/shopping_list";
import { Recipe } from "../src/classes/recipe";
import { NoTabAsIndentError, UnknownRecipePathError } from "../src/errors";
import type {
  ShoppingListRecipeRef,
  RecipeChoices,
  AddedIngredient,
} from "../src/types";
import { qPlain } from "./mocks/quantity";
import { recipeWithGroupedAlternatives } from "./fixtures/recipes";

const simpleRecipe = `
---
servings: 2
---
Mix @flour{100%g} and @sugar{50%g}
`;

const recipeWithAlternatives = `
---
servings: 1
---
Mix @milk{200%ml}|almond milk{100%ml}[vegan version]
`;

describe("ShoppingList file support", () => {
  // ──────────────────────────────────────────────────────────
  // loadFile
  // ──────────────────────────────────────────────────────────

  describe("loadFile", () => {
    it("should handle an empty file", () => {
      const list = new ShoppingList();
      const refs = list.loadFile("");
      expect(refs).toEqual([]);
      expect(list.manualItems).toEqual([]);
    });

    it("should parse recipe refs without frontmatter", () => {
      const content = `./Recipe A{4}\n./Recipe B\n`;
      const list = new ShoppingList();
      const refs = list.loadFile(content);
      expect(refs).toMatchObject<ShoppingListRecipeRef[]>([
        { path: "./Recipe A", servings: 4 },
        { path: "./Recipe B", servings: undefined },
      ]);
    });

    it("should parse frontmatter with choices", () => {
      const content = `---
choices:
  "./Complex Recipe":
    variant: spicy
    ingredientItems:
      flour: 1
    ingredientGroups:
      sauce: 0
---
./Complex Recipe{2}
`;
      const list = new ShoppingList();
      const refs = list.loadFile(content);
      expect(refs).toMatchObject<ShoppingListRecipeRef[]>([
        { path: "./Complex Recipe", servings: 2 },
      ]);
    });

    it("should parse recipe ref with servings", () => {
      const list = new ShoppingList();
      const refs = list.loadFile("./Recipe{2}\n");
      expect(refs).toMatchObject<ShoppingListRecipeRef[]>([
        { path: "./Recipe", servings: 2 },
      ]);
    });

    it("should parse recipe ref with decimal servings", () => {
      const list = new ShoppingList();
      const refs = list.loadFile("./Recipe{2.5}\n");
      expect(refs).toMatchObject<ShoppingListRecipeRef[]>([
        { path: "./Recipe", servings: 2.5 },
      ]);
    });

    it("should parse recipe ref without servings", () => {
      const list = new ShoppingList();
      const refs = list.loadFile("./Recipe\n");
      expect(refs).toMatchObject<ShoppingListRecipeRef[]>([
        { path: "./Recipe", servings: undefined },
      ]);
    });

    it("should handle path with spaces and unicode", () => {
      const list = new ShoppingList();
      const refs = list.loadFile("./desserts and sweets/Pancakes géants{4}\n");
      expect(refs).toMatchObject<ShoppingListRecipeRef[]>([
        {
          path: "./desserts and sweets/Pancakes géants",
          servings: 4,
        },
      ]);
    });

    it("should handle frontmatter without choices key", () => {
      const content = `---
someOtherKey: value
---
./Recipe
`;
      const list = new ShoppingList();
      const refs = list.loadFile(content);
      expect(refs).toMatchObject<ShoppingListRecipeRef[]>([
        { path: "./Recipe", servings: undefined },
      ]);
    });

    it("should handle comments and blank lines within frontmatter", () => {
      const content = `---
choices:
  "./Recipe":
    variant: spicy

    -- a comment inside yaml
---
./Recipe
`;
      const list = new ShoppingList();
      list.loadFile(content);
      // Should still parse correctly despite blank/comment lines in YAML
      // (verify by hydrating)
      const recipe = new Recipe(simpleRecipe);
      list.hydrateRecipe("./Recipe", recipe);
      const addedRecipe = list.recipes[0]!;
      expect(addedRecipe.choices).toBeDefined();
      expect(addedRecipe.choices!.variant).toBe("spicy");
    });

    it("should skip comments and blank lines", () => {
      const content = `-- this is a comment
./Recipe{2}

-- another comment

bread
`;
      const list = new ShoppingList();
      const refs = list.loadFile(content);
      expect(refs).toMatchObject<ShoppingListRecipeRef[]>([
        { path: "./Recipe", servings: 2 },
      ]);
      expect(list.manualItems).toMatchObject<AddedIngredient[]>([
        { name: "bread" },
      ]);
    });

    it("should collect free-hand items in manualItems", () => {
      const content = `./Recipe{2}
bread
olive oil
`;
      const list = new ShoppingList();
      const refs = list.loadFile(content);
      expect(refs).toHaveLength(1);
      expect(list.manualItems).toMatchObject<AddedIngredient[]>([
        { name: "bread" },
        { name: "olive oil" },
      ]);
    });

    it("should parse manual item with quantity and unit", () => {
      const content = `flour{500%g}\n`;
      const list = new ShoppingList();
      list.loadFile(content);
      expect(list.manualItems).toMatchObject<AddedIngredient[]>([
        {
          name: "flour",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 500 },
              },
              unit: "g",
            },
          ],
        },
      ]);
    });

    it("should parse manual item with quantity but no unit", () => {
      const content = `eggs{6}\n`;
      const list = new ShoppingList();
      list.loadFile(content);
      expect(list.manualItems).toMatchObject<AddedIngredient[]>([
        {
          name: "eggs",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 6 },
              },
            },
          ],
        },
      ]);
    });

    it("should parse manual item with fraction quantity", () => {
      const content = `flour{1/2%cup}\n`;
      const list = new ShoppingList();
      list.loadFile(content);
      expect(list.manualItems).toMatchObject<AddedIngredient[]>([
        {
          name: "flour",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "fraction", num: 1, den: 2 },
              },
              unit: "cup",
            },
          ],
        },
      ]);
    });

    it("should parse manual item with range quantity", () => {
      const content = `lemons{2-3}\n`;
      const list = new ShoppingList();
      list.loadFile(content);
      expect(list.manualItems).toMatchObject<AddedIngredient[]>([
        {
          name: "lemons",
          quantities: [
            {
              quantity: {
                type: "range",
                min: { type: "decimal", decimal: 2 },
                max: { type: "decimal", decimal: 3 },
              },
            },
          ],
        },
      ]);
    });

    it("should parse manual item with text quantity", () => {
      const content = `salt{a pinch}\n`;
      const list = new ShoppingList();
      list.loadFile(content);
      expect(list.manualItems).toMatchObject<AddedIngredient[]>([
        {
          name: "salt",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "text", text: "a pinch" },
              },
            },
          ],
        },
      ]);
    });
  });

  // ──────────────────────────────────────────────────────────
  // hydrateRecipe
  // ──────────────────────────────────────────────────────────

  describe("hydrateRecipe", () => {
    it("should populate recipes and ingredients after hydration", () => {
      const content = `./Simple Recipe{4}\n`;
      const list = new ShoppingList();
      list.loadFile(content);

      const recipe = new Recipe(simpleRecipe);
      list.hydrateRecipe("./Simple Recipe", recipe);

      expect(list.recipes).toHaveLength(1);
      expect(list.ingredients.length).toBeGreaterThan(0);
      // Recipe was scaled to 4 servings (base is 2), so quantities doubled
      const flour = list.ingredients.find((i) => i.name === "flour");
      expect(flour).toBeDefined();
      expect(flour!.quantities).toEqual([qPlain(200, "g")]);
    });

    it("should hydrate without servings (uses base scaling)", () => {
      const content = `./Simple Recipe\n`;
      const list = new ShoppingList();
      list.loadFile(content);

      const recipe = new Recipe(simpleRecipe);
      list.hydrateRecipe("./Simple Recipe", recipe);

      expect(list.recipes).toHaveLength(1);
    });

    it("should throw for unknown path", () => {
      const list = new ShoppingList();
      list.loadFile("./Recipe A\n");
      const recipe = new Recipe(simpleRecipe);
      expect(() => list.hydrateRecipe("./Unknown", recipe)).toThrow(
        UnknownRecipePathError,
      );
    });

    it("should hydrate with stored choices from frontmatter", () => {
      const content = `---
choices:
  "./Alt Recipe":
    ingredientItems:
      ingredient-item-0: 1
---
./Alt Recipe
`;
      const list = new ShoppingList();
      list.loadFile(content);

      const recipe = new Recipe(recipeWithAlternatives);
      list.hydrateRecipe("./Alt Recipe", recipe);

      expect(list.recipes).toHaveLength(1);
      const addedRecipe = list.recipes[0]!;
      expect(addedRecipe.choices).toBeDefined();
      expect(addedRecipe.choices!.ingredientItems).toBeInstanceOf(Map);
      expect(
        addedRecipe.choices!.ingredientItems!.get("ingredient-item-0"),
      ).toBe(1);

      const content2 = `---
choices:
  "./Alt Recipe":
    ingredientGroups:
      milk: 1
---
./Alt Recipe
`;
      const list2 = new ShoppingList();
      list2.loadFile(content2);

      const recipe2 = new Recipe(recipeWithGroupedAlternatives);
      list2.hydrateRecipe("./Alt Recipe", recipe2);

      expect(list2.recipes).toHaveLength(1);
      const addedRecipe2 = list2.recipes[0]!;
      expect(addedRecipe2.choices).toBeDefined();
      expect(addedRecipe2.choices!.ingredientGroups).toBeInstanceOf(Map);
      expect(addedRecipe2.choices!.ingredientGroups!.get("milk")).toBe(1);
    });
  });

  // ──────────────────────────────────────────────────────────
  // serializeFile
  // ──────────────────────────────────────────────────────────

  describe("serializeFile", () => {
    it("should ignore recipes without path when serializing", () => {
      const list = new ShoppingList();
      const recipe = new Recipe(simpleRecipe);
      // Add recipe without path
      list.recipes.push({
        recipe,
        servings: 1,
        choices: undefined,
      });
      const output = list.serializeFile();
      // Should not include recipe ref since no path
      expect(output).toBe("");
    });

    it("should serialize with no choices (no frontmatter)", () => {
      const list = new ShoppingList();
      const recipe = new Recipe(simpleRecipe);
      list.addRecipe(recipe, { path: "./Simple Recipe" });

      const output = list.serializeFile();
      expect(output).not.toContain("---");
      expect(output).toContain("./Simple Recipe");
    });

    it("should serialize with choices (frontmatter present)", () => {
      const list = new ShoppingList();
      const recipe = new Recipe(recipeWithAlternatives);
      const choices: RecipeChoices = {
        ingredientItems: new Map([["ingredient-item-0", 1]]),
      };
      list.addRecipe(recipe, {
        path: "./Alt Recipe",
        choices,
      });

      const output = list.serializeFile();
      expect(output).toContain("---");
      expect(output).toContain("choices:");
      expect(output).toContain('"./Alt Recipe"');
      expect(output).toContain("ingredientItems:");
      expect(output).toContain("ingredient-item-0: 1");
    });

    it("should serialize with servings", () => {
      const list = new ShoppingList();
      const recipe = new Recipe(simpleRecipe);
      list.addRecipe(recipe, {
        path: "./Simple Recipe",
        scaling: { servings: 4 },
      });

      const output = list.serializeFile();
      expect(output).toContain("./Simple Recipe{4}");
    });

    it("should serialize manual items after recipe refs with blank separator", () => {
      const list = new ShoppingList();
      const recipe = new Recipe(simpleRecipe);
      list.addRecipe(recipe, { path: "./Simple Recipe" });
      list.manualItems = [{ name: "bread" }, { name: "olive oil" }];

      const output = list.serializeFile();
      const lines = output.split("\n");
      const recipeLineIdx = lines.findIndex((l) =>
        l.startsWith("./Simple Recipe"),
      );
      expect(recipeLineIdx).toBeGreaterThanOrEqual(0);
      // blank separator line between recipe and manual items
      expect(lines[recipeLineIdx + 1]).toBe("");
      expect(lines[recipeLineIdx + 2]).toBe("bread");
      expect(lines[recipeLineIdx + 3]).toBe("olive oil");
    });

    it("should serialize manual items without separator when no recipes", () => {
      const list = new ShoppingList();
      list.manualItems = [{ name: "bread" }, { name: "olive oil" }];
      const output = list.serializeFile();
      expect(output).toBe("bread\nolive oil\n");
    });

    it("should serialize factor-based scaling as servings", () => {
      const list = new ShoppingList();
      const recipe = new Recipe(simpleRecipe); // servings: 2
      list.addRecipe(recipe, {
        path: "./Recipe",
        scaling: { factor: 3 },
      });

      const output = list.serializeFile();
      // base servings (2) * factor (3) = 6
      expect(output).toContain("./Recipe{6}");
    });

    it("should roundtrip loadFile -> serializeFile", () => {
      const content = `./Simple Recipe{4}
./Another Recipe

bread
olive oil
`;
      const list1 = new ShoppingList();
      list1.loadFile(content);

      // Hydrate with dummy recipes
      const recipe = new Recipe(simpleRecipe);
      list1.hydrateRecipe("./Simple Recipe", recipe);
      const recipe2 = new Recipe(simpleRecipe);
      list1.hydrateRecipe("./Another Recipe", recipe2);

      const serialized = list1.serializeFile();

      const list2 = new ShoppingList();
      const refs2 = list2.loadFile(serialized);
      expect(refs2).toMatchObject<ShoppingListRecipeRef[]>([
        { path: "./Another Recipe", servings: undefined },
        { path: "./Simple Recipe", servings: 4 },
      ]);
      expect(list2.manualItems).toMatchObject<AddedIngredient[]>([
        { name: "bread" },
        { name: "olive oil" },
      ]);
    });

    it("should serialize with variant in choices", () => {
      const list = new ShoppingList();
      const recipe = new Recipe(recipeWithAlternatives);
      const choices: RecipeChoices = {
        variant: "spicy",
        ingredientItems: new Map([["ingredient-item-0", 1]]),
      };
      list.addRecipe(recipe, {
        path: "./Recipe",
        choices,
      });

      const output = list.serializeFile();
      expect(output).toContain("variant: spicy");
    });

    it("should serialize with ingredientGroups in choices", () => {
      const list = new ShoppingList();
      const recipe = new Recipe(simpleRecipe);
      const choices: RecipeChoices = {
        ingredientGroups: new Map([["sauce", 0]]),
      };
      list.addRecipe(recipe, {
        path: "./Recipe",
        choices,
      });

      const output = list.serializeFile();
      expect(output).toContain("ingredientGroups:");
      expect(output).toContain("sauce: 0");
    });

    it("should skip empty choices in frontmatter", () => {
      const list = new ShoppingList();
      const recipe = new Recipe(simpleRecipe);
      // choices with no variant, no ingredientItems, no ingredientGroups
      const choices: RecipeChoices = {};
      list.addRecipe(recipe, {
        path: "./Recipe",
        choices,
      });

      const output = list.serializeFile();
      expect(output).not.toContain("---");
      expect(output).toContain("./Recipe");
    });

    it("should serialize manual item with quantity and unit", () => {
      const list = new ShoppingList();
      list.manualItems = [
        {
          name: "flour",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 500 },
              },
              unit: "g",
            },
          ],
        },
      ];

      const output = list.serializeFile();
      expect(output).toContain("flour{500%g}");
    });

    it("should serialize manual item with quantity but no unit", () => {
      const list = new ShoppingList();
      list.manualItems = [
        {
          name: "eggs",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 6 },
              },
            },
          ],
        },
      ];

      const output = list.serializeFile();
      expect(output).toContain("eggs{6}");
    });

    it("should serialize manual item with fraction quantity", () => {
      const list = new ShoppingList();
      list.manualItems = [
        {
          name: "flour",
          quantities: [
            {
              quantity: {
                type: "fixed",
                value: { type: "fraction", num: 1, den: 2 },
              },
              unit: "cup",
            },
          ],
        },
      ];

      const output = list.serializeFile();
      expect(output).toContain("flour{½%cup}");
    });

    it("should roundtrip manual items with quantities", () => {
      const content = `flour{500%g}
eggs{6}
bread
`;
      const list1 = new ShoppingList();
      list1.loadFile(content);

      const serialized = list1.serializeFile();
      expect(serialized).toContain("flour{500%g}");
      expect(serialized).toContain("eggs{6}");
      expect(serialized).toContain("bread");

      const list2 = new ShoppingList();
      list2.loadFile(serialized);
      expect(list2.manualItems).toMatchObject<AddedIngredient[]>([
        { name: "flour" },
        { name: "eggs" },
        { name: "bread" },
      ]);
      expect(list2.manualItems[0]!.quantities![0]!).toMatchObject(
        qPlain(500, "g"),
      );
    });
  });

  // ──────────────────────────────────────────────────────────
  // Manual items merged into ingredients
  // ──────────────────────────────────────────────────────────

  describe("manual items in ingredients", () => {
    it("should merge manual item quantities with recipe ingredients", () => {
      const list = new ShoppingList();
      const recipe = new Recipe(simpleRecipe); // flour 100g, sugar 50g
      list.addRecipe(recipe, { path: "./Recipe" });

      // Add manual flour with quantity
      list.manualItems = [
        {
          name: "flour",
          quantities: [qPlain(200, "g")],
        },
        { name: "bread", quantities: [qPlain(1)] },
      ];
      // Trigger recalculation
      list.addRecipe(new Recipe(simpleRecipe), { path: "./Recipe2" });
      list.removeRecipe(1);

      const flour = list.ingredients.find((i) => i.name === "flour");
      expect(flour).toBeDefined();
      // 100g (recipe) + 200g (manual) = 300g
      expect(flour!.quantities).toEqual([qPlain(300, "g")]);
      const bread = list.ingredients.find((i) => i.name === "bread");
      expect(bread).toBeDefined();
      expect(bread!.quantities).toEqual([qPlain(1)]);
    });

    it("should include manual item without quantity in ingredients", () => {
      const list = new ShoppingList();
      const recipe = new Recipe(simpleRecipe);
      list.addRecipe(recipe, { path: "./Recipe" });

      list.manualItems = [{ name: "bread" }];
      // Trigger recalculation
      list.addRecipe(new Recipe(simpleRecipe), { path: "./Recipe2" });
      list.removeRecipe(1);

      const bread = list.ingredients.find((i) => i.name === "bread");
      expect(bread).toBeDefined();
      expect(bread!.quantities).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────
  // loadCheckedFile
  // ──────────────────────────────────────────────────────────

  describe("loadCheckedFile", () => {
    it("should replay log where last entry wins", () => {
      const content = `+ flour
+ sugar
- flour
+ flour
`;
      const list = new ShoppingList();
      list.loadCheckedFile(content);
      expect(list.isChecked("flour")).toBe(true);
      expect(list.isChecked("sugar")).toBe(true);
    });

    it("should handle case-insensitive matching", () => {
      const content = `+ Flour
- flour
`;
      const list = new ShoppingList();
      list.loadCheckedFile(content);
      expect(list.isChecked("flour")).toBe(false);
      expect(list.isChecked("Flour")).toBe(false);
    });

    it("should skip blank lines and comments", () => {
      const content = `+ flour

-- this is a comment
+ sugar
`;
      const list = new ShoppingList();
      list.loadCheckedFile(content);
      expect(list.checkedItems.size).toBe(2);
    });
  });

  // ──────────────────────────────────────────────────────────
  // check / uncheck / isChecked / uncheckAll
  // ──────────────────────────────────────────────────────────

  describe("check / uncheck / isChecked", () => {
    it("should check and query correctly", () => {
      const list = new ShoppingList();
      list.check("Flour");
      expect(list.isChecked("flour")).toBe(true);
      expect(list.isChecked("FLOUR")).toBe(true);
    });

    it("should uncheck correctly", () => {
      const list = new ShoppingList();
      list.check("flour");
      list.uncheck("Flour");
      expect(list.isChecked("flour")).toBe(false);
    });

    it("should uncheckAll", () => {
      const list = new ShoppingList();
      list.check("flour");
      list.check("sugar");
      list.uncheckAll();
      expect(list.checkedItems.size).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────
  // serializeCheckedFile
  // ──────────────────────────────────────────────────────────

  describe("serializeCheckedFile", () => {
    it("should produce sorted alphabetical output", () => {
      const list = new ShoppingList();
      list.check("sugar");
      list.check("flour");
      list.check("butter");
      const output = list.serializeCheckedFile();
      expect(output).toBe("+ butter\n+ flour\n+ sugar\n");
    });

    it("should return empty string when no items checked", () => {
      const list = new ShoppingList();
      expect(list.serializeCheckedFile()).toBe("");
    });

    it("should roundtrip serializeCheckedFile -> loadCheckedFile", () => {
      const list1 = new ShoppingList();
      list1.check("flour");
      list1.check("butter");
      const content = list1.serializeCheckedFile();

      const list2 = new ShoppingList();
      list2.loadCheckedFile(content);
      expect(list2.isChecked("flour")).toBe(true);
      expect(list2.isChecked("butter")).toBe(true);
      expect(list2.checkedItems.size).toBe(2);
    });
  });

  // ──────────────────────────────────────────────────────────
  // checkedAppendLine (static)
  // ──────────────────────────────────────────────────────────

  describe("checkedAppendLine", () => {
    it('should produce "+ name\\n" for checked', () => {
      expect(ShoppingList.checkedAppendLine("flour", true)).toBe("+ flour\n");
    });

    it('should produce "- name\\n" for unchecked', () => {
      expect(ShoppingList.checkedAppendLine("flour", false)).toBe("- flour\n");
    });
  });

  // ──────────────────────────────────────────────────────────
  // compactCheckedFile (static)
  // ──────────────────────────────────────────────────────────

  describe("compactCheckedFile", () => {
    it("should replay log and output only final + entries sorted", () => {
      const content = `+ flour
+ sugar
- butter
+ butter
- flour
+ flour
`;
      const compacted = ShoppingList.compactCheckedFile(content);
      expect(compacted).toBe("+ butter\n+ flour\n+ sugar\n");
    });

    it("should return empty string when all unchecked", () => {
      const content = `+ flour
- flour
`;
      expect(ShoppingList.compactCheckedFile(content)).toBe("");
    });

    it("should skip comments and blank lines", () => {
      const content = `+ flour

-- a comment
+ sugar
`;
      expect(ShoppingList.compactCheckedFile(content)).toBe(
        "+ flour\n+ sugar\n",
      );
    });
  });

  // ──────────────────────────────────────────────────────────
  // CRLF (\r\n) support
  // ──────────────────────────────────────────────────────────

  describe("CRLF line endings", () => {
    it("loadFile should parse recipe refs with \\r\\n endings", () => {
      const content = "./Recipe A{4}\r\n./Recipe B\r\n";
      const list = new ShoppingList();
      const refs = list.loadFile(content);
      expect(refs).toMatchObject<ShoppingListRecipeRef[]>([
        { path: "./Recipe A", servings: 4 },
        { path: "./Recipe B", servings: undefined },
      ]);
    });

    it("loadFile should parse frontmatter with \\r\\n endings", () => {
      const content =
        '---\r\nchoices:\r\n  "./Recipe":\r\n    variant: spicy\r\n---\r\n./Recipe\r\n';
      const list = new ShoppingList();
      const refs = list.loadFile(content);
      expect(refs).toMatchObject<ShoppingListRecipeRef[]>([
        { path: "./Recipe", servings: undefined },
      ]);
      const recipe = new Recipe(simpleRecipe);
      list.hydrateRecipe("./Recipe", recipe);
      expect(list.recipes[0]!.choices!.variant).toBe("spicy");
    });

    it("loadFile should collect manual items with \\r\\n endings", () => {
      const content = "./Recipe{2}\r\n\r\nbread\r\nolive oil\r\n";
      const list = new ShoppingList();
      list.loadFile(content);
      expect(list.manualItems).toMatchObject<AddedIngredient[]>([
        { name: "bread" },
        { name: "olive oil" },
      ]);
    });

    it("loadCheckedFile should replay log with \\r\\n endings", () => {
      const content = "+ flour\r\n+ sugar\r\n- flour\r\n";
      const list = new ShoppingList();
      list.loadCheckedFile(content);
      expect(list.isChecked("flour")).toBe(false);
      expect(list.isChecked("sugar")).toBe(true);
    });

    it("compactCheckedFile should handle \\r\\n endings", () => {
      const content = "+ flour\r\n+ sugar\r\n- flour\r\n+ flour\r\n";
      expect(ShoppingList.compactCheckedFile(content)).toBe(
        "+ flour\n+ sugar\n",
      );
    });
  });

  // ──────────────────────────────────────────────────────────
  // Tab rejection in frontmatter
  // ──────────────────────────────────────────────────────────

  describe("tab indentation rejection", () => {
    it("should throw NoTabAsIndentError for tab-indented frontmatter", () => {
      const content = `---
choices:
\t"./Recipe":
\t\tvariant: spicy
---
./Recipe
`;
      const list = new ShoppingList();
      expect(() => list.loadFile(content)).toThrow(NoTabAsIndentError);
    });

    it("should throw NoTabAsIndentError for mixed tab/space indentation", () => {
      const content = `---
choices:
  "./Recipe":
  \tvariant: spicy
---
./Recipe
`;
      const list = new ShoppingList();
      expect(() => list.loadFile(content)).toThrow(NoTabAsIndentError);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Frontmatter roundtrip
  // ──────────────────────────────────────────────────────────

  describe("serializeFile -> loadFile roundtrip with choices", () => {
    it("should roundtrip choices with ingredientItems and variant", () => {
      const list1 = new ShoppingList();
      const recipe = new Recipe(recipeWithAlternatives);
      const choices: RecipeChoices = {
        variant: "spicy",
        ingredientItems: new Map([["ingredient-item-0", 1]]),
        ingredientGroups: new Map([["sauce", 0]]),
      };
      list1.addRecipe(recipe, {
        path: "./Complex Recipe",
        choices,
      });
      list1.manualItems = [{ name: "bread" }];

      const serialized = list1.serializeFile();
      const list2 = new ShoppingList();
      const refs = list2.loadFile(serialized);

      expect(refs).toHaveLength(1);
      expect(list2.manualItems).toMatchObject<AddedIngredient[]>([
        { name: "bread" },
      ]);

      // Hydrate to verify choices come through
      const recipe2 = new Recipe(recipeWithAlternatives);
      list2.hydrateRecipe("./Complex Recipe", recipe2);
      const addedRecipe = list2.recipes[0]!;
      expect(addedRecipe.choices).toBeDefined();
      expect(addedRecipe.choices!.variant).toBe("spicy");
      expect(addedRecipe.choices!.ingredientItems).toBeInstanceOf(Map);
      expect(
        addedRecipe.choices!.ingredientItems!.get("ingredient-item-0"),
      ).toBe(1);
      expect(addedRecipe.choices!.ingredientGroups).toBeInstanceOf(Map);
      expect(addedRecipe.choices!.ingredientGroups!.get("sauce")).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Nested recipe refs
  // ──────────────────────────────────────────────────────────

  describe("nested recipe refs", () => {
    describe("loadFile (parsing)", () => {
      it("should resolve nested refs to full paths", () => {
        const content = `./Plans/3 Day Plan I
  ./Breakfast/Mexican Style Burrito{2}
  ./Salads
    ./Boring{2}
    ./Green{4}
  ./Slowcooker/Slow-cooker beef stew
`;
        const list = new ShoppingList();
        const refs = list.loadFile(content);
        expect(refs).toMatchObject<ShoppingListRecipeRef[]>([
          {
            path: "./Plans/3 Day Plan I/Breakfast/Mexican Style Burrito",
            servings: 2,
          },
          { path: "./Plans/3 Day Plan I/Salads/Boring", servings: 2 },
          { path: "./Plans/3 Day Plan I/Salads/Green", servings: 4 },
          {
            path: "./Plans/3 Day Plan I/Slowcooker/Slow-cooker beef stew",
            servings: undefined,
          },
        ]);
      });

      it("should treat root-level refs as leaves (no nesting)", () => {
        const content = `./Recipe A{4}
./Recipe B
`;
        const list = new ShoppingList();
        const refs = list.loadFile(content);
        expect(refs).toMatchObject<ShoppingListRecipeRef[]>([
          { path: "./Recipe A", servings: 4 },
          { path: "./Recipe B", servings: undefined },
        ]);
      });

      it("should handle single nested child", () => {
        const content = `./Folder
  ./Recipe{3}
`;
        const list = new ShoppingList();
        const refs = list.loadFile(content);
        expect(refs).toMatchObject<ShoppingListRecipeRef[]>([
          { path: "./Folder/Recipe", servings: 3 },
        ]);
      });

      it("should handle deeply nested refs", () => {
        const content = `./A
  ./B
    ./C
      ./D{1}
`;
        const list = new ShoppingList();
        const refs = list.loadFile(content);
        expect(refs).toMatchObject<ShoppingListRecipeRef[]>([
          { path: "./A/B/C/D", servings: 1 },
        ]);
      });

      it("should handle sibling groups at same indent", () => {
        const content = `./Meals
  ./Breakfast{2}
  ./Lunch{4}
./Snacks
  ./Cookies{6}
`;
        const list = new ShoppingList();
        const refs = list.loadFile(content);
        expect(refs).toMatchObject<ShoppingListRecipeRef[]>([
          { path: "./Meals/Breakfast", servings: 2 },
          { path: "./Meals/Lunch", servings: 4 },
          { path: "./Snacks/Cookies", servings: 6 },
        ]);
      });

      it("should not treat manual items as part of nesting", () => {
        const content = `./Folder
  ./Recipe{2}
bread
./Another Recipe
`;
        const list = new ShoppingList();
        const refs = list.loadFile(content);
        expect(refs).toMatchObject<ShoppingListRecipeRef[]>([
          { path: "./Folder/Recipe", servings: 2 },
          { path: "./Another Recipe", servings: undefined },
        ]);
        expect(list.manualItems).toMatchObject<AddedIngredient[]>([
          { name: "bread" },
        ]);
      });

      it("should throw NoTabAsIndentError for tab-indented refs", () => {
        const content = `./Folder
\t./Recipe{2}
`;
        const list = new ShoppingList();
        expect(() => list.loadFile(content)).toThrow(NoTabAsIndentError);
      });

      it("should merge frontmatter choices with nested ref paths", () => {
        const content = `---
choices:
  "./Folder/Recipe":
    variant: spicy
    ingredientItems:
      ingredient-item-0: 1
---
./Folder
  ./Recipe
`;
        const list = new ShoppingList();
        const refs = list.loadFile(content);
        expect(refs).toMatchObject<ShoppingListRecipeRef[]>([
          { path: "./Folder/Recipe", servings: undefined },
        ]);

        const recipe = new Recipe(recipeWithAlternatives);
        list.hydrateRecipe("./Folder/Recipe", recipe);
        expect(list.recipes[0]!.choices!.variant).toBe("spicy");
        expect(
          list.recipes[0]!.choices!.ingredientItems!.get("ingredient-item-0"),
        ).toBe(1);
      });
    });

    describe("serializeFile (nesting)", () => {
      it("should nest recipes sharing a common path prefix", () => {
        const list = new ShoppingList();
        const recipe = new Recipe(simpleRecipe);

        list.addRecipe(recipe, {
          path: "./Plans/3 Day Plan I/Breakfast/Mexican Style Burrito",
          scaling: { servings: 2 },
        });
        list.addRecipe(recipe, {
          path: "./Plans/3 Day Plan I/Salads/Boring",
          scaling: { servings: 2 },
        });
        list.addRecipe(recipe, {
          path: "./Plans/3 Day Plan I/Salads/Green",
          scaling: { servings: 4 },
        });
        list.addRecipe(recipe, {
          path: "./Plans/3 Day Plan I/Slowcooker/Slow-cooker beef stew",
        });

        const output = list.serializeFile();
        expect(output).toBe(
          [
            "./Plans/3 Day Plan I",
            "  ./Breakfast/Mexican Style Burrito{2}",
            "  ./Salads",
            "    ./Boring{2}",
            "    ./Green{4}",
            "  ./Slowcooker/Slow-cooker beef stew",
            "",
          ].join("\n"),
        );
      });

      it("should emit flat refs when no common prefix exists", () => {
        const list = new ShoppingList();
        const recipe = new Recipe(simpleRecipe);
        list.addRecipe(recipe, { path: "./Alpha" });
        list.addRecipe(recipe, { path: "./Beta" });

        const output = list.serializeFile();
        expect(output).toBe("./Alpha\n./Beta\n");
      });

      it("should collapse single-child non-leaf chains", () => {
        const list = new ShoppingList();
        const recipe = new Recipe(simpleRecipe);
        list.addRecipe(recipe, { path: "./A/B/C/Leaf1" });
        list.addRecipe(recipe, { path: "./A/B/C/Leaf2" });

        const output = list.serializeFile();
        expect(output).toBe(
          ["./A/B/C", "  ./Leaf1", "  ./Leaf2", ""].join("\n"),
        );
      });

      it("should sort recipe refs alphabetically", () => {
        const list = new ShoppingList();
        const recipe = new Recipe(simpleRecipe);
        list.addRecipe(recipe, { path: "./Zebra" });
        list.addRecipe(recipe, { path: "./Apple" });
        list.addRecipe(recipe, { path: "./Mango" });

        const output = list.serializeFile();
        expect(output).toBe("./Apple\n./Mango\n./Zebra\n");
      });

      it("should roundtrip nested refs through serialize → load", () => {
        const list1 = new ShoppingList();
        const recipe = new Recipe(simpleRecipe);

        list1.addRecipe(recipe, {
          path: "./Plans/Breakfast/Burrito",
          scaling: { servings: 2 },
        });
        list1.addRecipe(recipe, {
          path: "./Plans/Dinner/Stew",
          scaling: { servings: 4 },
        });
        list1.addRecipe(recipe, { path: "./Snacks/Cookies" });
        list1.manualItems = [{ name: "bread" }];

        const serialized = list1.serializeFile();

        const list2 = new ShoppingList();
        const refs = list2.loadFile(serialized);

        expect(refs).toMatchObject<ShoppingListRecipeRef[]>([
          { path: "./Plans/Breakfast/Burrito", servings: 2 },
          { path: "./Plans/Dinner/Stew", servings: 4 },
          { path: "./Snacks/Cookies", servings: undefined },
        ]);
        expect(list2.manualItems).toMatchObject<AddedIngredient[]>([
          { name: "bread" },
        ]);
      });

      it("should emit flat when a recipe path is also a prefix of another", () => {
        const list = new ShoppingList();
        const recipe = new Recipe(simpleRecipe);
        // ./A is both a recipe and a prefix of ./A/B
        list.addRecipe(recipe, { path: "./A" });
        list.addRecipe(recipe, { path: "./A/B" });

        const output = list.serializeFile();
        // ./A is emitted as a leaf, ./A/B is emitted flat at the same level
        expect(output).toBe("./A\n./A/B\n");
      });

      it("should emit flat descendants at deeper levels under a leaf node", () => {
        const list = new ShoppingList();
        const recipe = new Recipe(simpleRecipe);
        // ./A is a recipe, ./A/B and ./A/C are deeper descendants
        list.addRecipe(recipe, { path: "./A" });
        list.addRecipe(recipe, { path: "./A/B" });
        list.addRecipe(recipe, { path: "./A/C" });

        const output = list.serializeFile();
        expect(output).toBe("./A\n./A/B\n./A/C\n");
      });
    });
  });
});
