import { describe, it, expect } from "vitest";
import { Section as SectionObject } from "../src/classes/section";
import type { Step, MetadataExtract, Cookware, Ingredient } from "../src/types";
import {
  flushPendingNote,
  flushPendingItems,
  parseSimpleMetaVar,
  parseScalingMetaVar,
  parseListMetaVar,
  parseFixedValue,
  parseQuantityInput,
  extractMetadata,
  findAndUpsertCookware,
  findAndUpsertIngredient,
} from "../src/parser_helpers";

describe("parseSimpleMetaVar", () => {
  it("should parse canonical string vars", () => {
    expect(parseSimpleMetaVar("title: My Awesome Recipe", "title")).toEqual(
      "My Awesome Recipe",
    );
    expect(parseSimpleMetaVar(`title: My Awesome\n Recipe`, "title")).toEqual(
      "My Awesome Recipe",
    );
    expect(parseSimpleMetaVar(`title: My Awesome\nrecipe`, "title")).toEqual(
      "My Awesome",
    );
  });

  it("should parse string vars containing commas", () => {
    expect(parseSimpleMetaVar("servings: 6, 12 crepes", "servings")).toEqual(
      "6, 12 crepes",
    );
  });

  it("should parse metadata names containing dots", () => {
    expect(parseSimpleMetaVar("time.prep: 15m", "time.prep")).toEqual("15m");
  });
});

describe("parseScalingMetaVar", () => {
  it("should parse canonical string vars", () => {
    expect(parseScalingMetaVar("servings: 6", "servings")).toEqual([6, "6"]);
  });
  it("should parse scaling type vars", () => {
    expect(parseScalingMetaVar("yield: 6, 2 people", "yield")).toEqual([
      6,
      "6, 2 people",
    ]);
    expect(
      parseScalingMetaVar("servings: 2, 4 small buckets", "servings"),
    ).toEqual([2, "2, 4 small buckets"]);
  });
  it("should throw and error if a number is not given as scaling variable", () => {
    expect(() => parseScalingMetaVar("servings: two", "servings")).toThrowError(
      "Scaling variables should be numbers",
    );
  });
  it("should accept various space patterns", () => {
    expect(parseScalingMetaVar("servings: 2,2 people", "servings")).toEqual([
      2,
      "2,2 people",
    ]);
    expect(
      parseScalingMetaVar("servings:   2 ,  2 people", "servings"),
    ).toEqual([2, "2 ,  2 people"]);
  });
});

describe("parseListMetaVar", () => {
  it("should parse lists in both YAML styles", () => {
    const expected_list = ["one", "two", "three"];
    const content_inline = "tags: [one,two,three]";
    expect(parseListMetaVar(content_inline, "tags")).toEqual(expected_list);
    const content_bullets = `
tags:
  - one
  - two
  - three`;
    expect(parseListMetaVar(content_bullets, "tags")).toEqual(expected_list);
  });
});

describe("extractMetadata", () => {
  it("should return an empty object if no metadata block is present", () => {
    const content = "Just some recipe content without metadata.";
    expect(extractMetadata(content)).toEqual({ metadata: {} });
  });

  it("should return an empty object if metavars are declared outside of block", () => {
    const content = `
---
Some rubbish
---
title: My Awesome Recipe
`;
    expect(extractMetadata(content)).toEqual({ metadata: {} });
  });

  it("should extract single string metadata fields correctly", () => {
    const content_canonical = `---
title: My Awesome Recipe
---
    `;
    const content_with_body = `
---
title: My Awesome Recipe
---
Recipe steps ...
    `;
    const expected: MetadataExtract = {
      metadata: {
        title: "My Awesome Recipe",
      },
    };
    expect(extractMetadata(content_canonical)).toEqual(expected);
    expect(extractMetadata(content_with_body)).toEqual(expected);
  });

  it("should disregard incorrectly written string metadata fields", () => {
    const content_wrong_newline = `
---
title: My Awesome 
Recipe
---
    `;
    const expected: MetadataExtract = {
      metadata: {
        title: "My Awesome",
      },
    };
    expect(extractMetadata(content_wrong_newline)).toEqual(expected);
  });

  it("should extract servings metadata field correctly", () => {
    const content_canonical = `
---
servings: 2
---
    `;
    const expected_canonical: MetadataExtract = {
      metadata: {
        servings: "2",
      },
      servings: 2,
    };
    expect(extractMetadata(content_canonical)).toEqual(expected_canonical);

    const content_complex = `
---
servings: 2, a couple
---
    `;
    const expected_complex: MetadataExtract = {
      metadata: {
        servings: "2, a couple",
      },
      servings: 2,
    };
    expect(extractMetadata(content_complex)).toEqual(expected_complex);
  });

  it("should extract list metadata fields in both styles correctly", () => {
    const content_inline = `
---
tags: [one, two, three]
---
    `;
    const content_bullets = `
---
tags:
  - one
  - two
  - three
---
`;
    const expected: MetadataExtract = {
      metadata: {
        tags: ["one", "two", "three"],
      },
    };
    expect(extractMetadata(content_inline)).toEqual(expected);
    expect(extractMetadata(content_bullets)).toEqual(expected);
  });

  it("should handle different spacing and trim values", () => {
    const content = `
---
title:     Spaced Out Recipe  
servings:  2
tags:      [ one,two, three ]
---
`;
    const expected: MetadataExtract = {
      metadata: {
        title: "Spaced Out Recipe",
        servings: "2",
        tags: ["one", "two", "three"],
      },
      servings: 2,
    };
    expect(extractMetadata(content)).toEqual(expected);
  });

  it("should handle all possible metadata fields", () => {
    const content = `
---
title: Sheet-Pan Baked Feta With Broccolini, Tomatoes and Lemon
tags: [dinner, oven-only]
source: https://cooking.nytimes.com/recipes/1021277-sheet-pan-baked-feta-with-broccolini-tomatoes-and-lemon
author: Yasmin Fahr
servings: 4
prep time: 10m
cook time: 15m
time: 25m
difficulty: easy
cuisine: continental
diet: vegan
description: A very easy sheet pan dinner
             from the New York Times
images: [https://static01.nyt.com/images/2021/12/28/dining/yf-baked-feta/yf-baked-feta-master768.jpg?quality=75&auto=webp]
---
`;
    const expected: MetadataExtract = {
      metadata: {
        title: "Sheet-Pan Baked Feta With Broccolini, Tomatoes and Lemon",
        tags: ["dinner", "oven-only"],
        source:
          "https://cooking.nytimes.com/recipes/1021277-sheet-pan-baked-feta-with-broccolini-tomatoes-and-lemon",
        author: "Yasmin Fahr",
        servings: "4",
        "prep time": "10m",
        "cook time": "15m",
        time: "25m",
        difficulty: "easy",
        cuisine: "continental",
        diet: "vegan",
        description: "A very easy sheet pan dinner from the New York Times",
        images: [
          "https://static01.nyt.com/images/2021/12/28/dining/yf-baked-feta/yf-baked-feta-master768.jpg?quality=75&auto=webp",
        ],
      },
      servings: 4,
    };
    expect(extractMetadata(content)).toEqual(expected);
  });
});

describe("flushPendingNote", () => {
  it("should add a note to the section if the note is not empty", () => {
    const section = new SectionObject("Test Section");
    const note = "This is a test note.";

    const result = flushPendingNote(section, note);

    expect(section.content).toHaveLength(1);
    expect(section.content[0]).toEqual({
      type: "note",
      note: "This is a test note.",
    });
    expect(result).toBe("");
  });

  it("should not add a note if it is empty and return an empty string", () => {
    const section = new SectionObject("Test Section");
    const note = "";

    const result = flushPendingNote(section, note);

    expect(section.content).toHaveLength(0);
    expect(result).toBe("");
  });
});

describe("flushPendingItems", () => {
  it("should add items as a step, clear the original array, and return true", () => {
    const section = new SectionObject("Test Section");
    const items: Step["items"] = [{ type: "text", value: "do something" }];

    const result = flushPendingItems(section, items);

    expect(result).toBe(true);
    expect(section.content).toHaveLength(1);
    expect((section.content[0] as Step).items[0]).toEqual({
      type: "text",
      value: "do something",
    });
    expect(items).toHaveLength(0);
  });

  it("should do nothing and return false if items array is empty", () => {
    const section = new SectionObject("Test Section");
    const items: Step["items"] = [];
    const result = flushPendingItems(section, items);
    expect(result).toBe(false);
    expect(section.content).toHaveLength(0);
  });
});

describe("findAndUpsertCookware", () => {
  it("should correctly add a non-referenced cookware", () => {
    const cookware: Cookware[] = [{ name: "oven", flags: [] }];
    const newCookware: Cookware = { name: "pan", flags: [] };
    expect(findAndUpsertCookware(cookware, newCookware, false)).toEqual({
      cookwareIndex: 1,
      quantityPartIndex: undefined,
    });
    expect(cookware.length).toEqual(2);
  });

  it("should correctly add a referenced cookware", () => {
    const cookware: Cookware[] = [{ name: "oven", flags: [] }];
    const newCookware: Cookware = {
      name: "oven",
      quantity: { type: "fixed", value: { type: "decimal", value: 1 } },
      quantityParts: [{ type: "fixed", value: { type: "decimal", value: 1 } }],
      flags: [],
    };
    expect(findAndUpsertCookware(cookware, newCookware, true)).toEqual({
      cookwareIndex: 0,
      quantityPartIndex: 0,
    });
    expect(cookware.length).toBe(1);
    expect(cookware[0]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 1 },
    });
    expect(cookware[0]!.quantityParts).toEqual([
      {
        type: "fixed",
        value: { type: "decimal", value: 1 },
      },
    ]);
  });

  it("should add quantities of referenced cookware", () => {
    const cookware: Cookware[] = [
      {
        name: "oven",
        quantity: { type: "fixed", value: { type: "decimal", value: 1 } },
        flags: [],
      },
    ];
    const newCookware: Cookware = {
      name: "oven",
      quantity: { type: "fixed", value: { type: "decimal", value: 2 } },
      flags: [],
    };
    findAndUpsertCookware(cookware, newCookware, true);
    expect(cookware[0]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 3 },
    });
  });

  it("should insert a new cookware if the referenced one has a text quantity", () => {
    const cookware: Cookware[] = [
      {
        name: "oven",
        quantity: { type: "fixed", value: { type: "text", value: "one" } },
        flags: [],
      },
    ];
    const newCookware: Cookware = {
      name: "oven",
      quantity: { type: "fixed", value: { type: "decimal", value: 1 } },
      flags: [],
    };
    findAndUpsertCookware(cookware, newCookware, true);
    expect(cookware.length).toEqual(2);
  });

  it("should throw an error if a reference cookware does not exist", () => {
    const newCookware: Cookware = { name: "unreferenced-cookware", flags: [] };
    expect(() => findAndUpsertCookware([], newCookware, true)).toThrowError(
      "Referenced cookware \"unreferenced-cookware\" not found. A referenced cookware must be declared before being referenced with '&'.",
    );
  });
});

describe("findAndUpsertIngredient", () => {
  it("should correctly add a non-referenced ingredient", () => {
    const ingredients: Ingredient[] = [];
    const newIngredient: Ingredient = {
      name: "eggs",
      quantity: { type: "fixed", value: { type: "decimal", value: 1 } },
      quantityParts: [
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          scalable: true,
        },
      ],
      flags: [],
    };
    expect(findAndUpsertIngredient(ingredients, newIngredient, false)).toEqual({
      ingredientIndex: 0,
      quantityPartIndex: 0,
    });
    expect(ingredients).toEqual([newIngredient]);
  });

  it("should not return a quantityPartIndex for a non-quantified ingredient", () => {
    const ingredients: Ingredient[] = [];
    const newIngredient: Ingredient = {
      name: "flour",
      flags: [],
      quantity: undefined,
      unit: undefined,
      quantityParts: undefined,
      preparation: undefined,
    };
    expect(findAndUpsertIngredient(ingredients, newIngredient, false)).toEqual({
      ingredientIndex: 0,
      quantityPartIndex: undefined,
    });
  });

  it("should correctly add a referenced ingredient", () => {
    const ingredients: Ingredient[] = [
      {
        name: "eggs",
        quantity: { type: "fixed", value: { type: "decimal", value: 1 } },
        quantityParts: [
          {
            value: { type: "fixed", value: { type: "decimal", value: 1 } },
            scalable: true,
          },
        ],
        flags: [],
      },
    ];
    const newIngredient: Ingredient = {
      name: "eggs",
      quantity: { type: "fixed", value: { type: "decimal", value: 2 } },
      quantityParts: [
        {
          value: { type: "fixed", value: { type: "decimal", value: 2 } },
          scalable: true,
        },
      ],
      flags: [],
    };
    expect(findAndUpsertIngredient(ingredients, newIngredient, true)).toEqual({
      ingredientIndex: 0,
      quantityPartIndex: 1,
    });
    expect(ingredients[0]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 3 },
    });

    const ingredients_noqtt: Ingredient[] = [{ name: "salt", flags: [] }];
    const newIngredient_noqtt: Ingredient = { name: "salt", flags: [] };
    expect(
      findAndUpsertIngredient(ingredients_noqtt, newIngredient_noqtt, true),
    ).toEqual({
      ingredientIndex: 0,
      quantityPartIndex: undefined,
    });
    expect(ingredients_noqtt[0]!.quantity).toBe(undefined);
  });

  it("should insert new ingredient if referenced ingredient has a text quantity", () => {
    const ingredients: Ingredient[] = [
      {
        name: "eggs",
        quantity: { type: "fixed", value: { type: "text", value: "one" } },
        quantityParts: [
          {
            value: { type: "fixed", value: { type: "text", value: "one" } },
            scalable: true,
          },
        ],
        flags: [],
      },
    ];
    const newIngredient: Ingredient = {
      name: "eggs",
      quantity: { type: "fixed", value: { type: "decimal", value: 1 } },
      quantityParts: [
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          scalable: true,
        },
      ],
      flags: [],
    };
    expect(findAndUpsertIngredient(ingredients, newIngredient, true)).toEqual({
      ingredientIndex: 1,
      quantityPartIndex: 0,
    });
    expect(ingredients).toHaveLength(2);
  });

  it("should adopt quantity of new ingredient if referenced one has none", () => {
    const ingredients: Ingredient[] = [{ name: "eggs", flags: [] }];
    const newIngredient: Ingredient = {
      name: "eggs",
      quantity: { type: "fixed", value: { type: "decimal", value: 1 } },
      quantityParts: [
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          scalable: true,
        },
      ],
      flags: [],
    };
    expect(findAndUpsertIngredient(ingredients, newIngredient, true)).toEqual({
      ingredientIndex: 0,
      quantityPartIndex: 0,
    });
    expect(ingredients[0]?.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 1 },
    });
  });

  it("should throw an error if an non-existing ingredient is referenced", () => {
    const ingredients: Ingredient[] = [
      {
        name: "eggs",
        quantity: { type: "fixed", value: { type: "decimal", value: 1 } },
        quantityParts: [
          {
            value: { type: "fixed", value: { type: "decimal", value: 1 } },
            scalable: true,
          },
        ],
        flags: [],
      },
    ];
    const newIngredient: Ingredient = {
      name: "unreferenced-ingredient",
      quantity: { type: "fixed", value: { type: "decimal", value: 100 } },
      unit: "g",
      quantityParts: [
        {
          value: { type: "fixed", value: { type: "decimal", value: 100 } },
          unit: "g",
          scalable: true,
        },
      ],
      flags: [],
    };
    expect(() =>
      findAndUpsertIngredient(ingredients, newIngredient, true),
    ).toThrowError(
      "Referenced ingredient \"unreferenced-ingredient\" not found. A referenced ingredient must be declared before being referenced with '&'.",
    );
  });
});

describe("parseFixedValue", () => {
  it("parses non numerical value as text", () => {
    expect(parseFixedValue("1-ish")).toEqual({ type: "text", value: "1-ish" });
  });

  it("parses fractions as such", () => {
    expect(parseFixedValue("1/2")).toEqual({
      type: "fraction",
      num: 1,
      den: 2,
    });
  });

  it("parses decimal values as such", () => {
    expect(parseFixedValue("1.5")).toEqual({ type: "decimal", value: 1.5 });
    expect(parseFixedValue("0.1")).toEqual({ type: "decimal", value: 0.1 });
    expect(parseFixedValue("1")).toEqual({ type: "decimal", value: 1 });
  });
});

describe("parseQuantityInput", () => {
  it("correctly parses ranges", () => {
    expect(parseQuantityInput("1-2")).toEqual({
      type: "range",
      min: { type: "decimal", value: 1 },
      max: { type: "decimal", value: 2 },
    });
    expect(parseQuantityInput("1/2-1")).toEqual({
      type: "range",
      min: { type: "fraction", num: 1, den: 2 },
      max: { type: "decimal", value: 1 },
    });
  });

  it("correctly parses fixed values", () => {
    expect(parseQuantityInput("1")).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 1 },
    });
    expect(parseQuantityInput("1.2")).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 1.2 },
    });
  });
});
