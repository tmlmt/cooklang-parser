import { describe, it, expect } from "vitest";
import { Section as SectionObject } from "../src/classes/section";
import type {
  Step,
  MetadataExtract,
  Cookware,
  Ingredient,
  NoteItem,
  TextItem,
  Yield,
} from "../src/types";
import {
  flushPendingNote,
  flushPendingItems,
  parseSimpleMetaVar,
  parseServingsMetaVar,
  parseYieldMetaVar,
  parseArbitraryQuantity,
  parseListMetaVar,
  parseFixedValue,
  parseQuantityValue,
  parseNestedMetaVar,
  parseNestedBlock,
  parseBlockScalarMetaVar,
  parseMarkdownSegments,
  extractMetadata,
  findAndUpsertCookware,
  findAndUpsertIngredient,
  stringifyQuantityValue,
  unionOfSets,
  parseQuantityWithUnit,
  parseDateFromFormat,
  parseFuzzyDate,
  getNumericValueFromYield,
} from "../src/utils/parser_helpers";
import {
  NoTabAsIndentError,
  BadIndentationError,
  ReferencedItemCannotBeRedefinedError,
} from "../src/errors";

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

describe("parseServingsMetaVar", () => {
  it("should parse a plain number", () => {
    expect(parseServingsMetaVar("servings: 6", "servings")).toEqual({
      numericValue: 6,
      rawValue: 6,
    });
  });
  it("should parse full-width separators and digits", () => {
    expect(parseServingsMetaVar("servings：６", "servings")).toEqual({
      numericValue: 6,
      rawValue: 6,
    });
  });
  it("should parse serves", () => {
    expect(parseServingsMetaVar("serves: 4", "serves")).toEqual({
      numericValue: 4,
      rawValue: 4,
    });
  });
  it("should parse decimal numbers", () => {
    expect(parseServingsMetaVar("servings: 1.5", "servings")).toEqual({
      numericValue: 1.5,
      rawValue: 1.5,
    });
  });
  it("should return text as rawValue and default numericValue to 1 for non-numeric input", () => {
    expect(parseServingsMetaVar("servings: two", "servings")).toEqual({
      numericValue: 1,
      rawValue: "two",
    });
  });
  it("should return undefined when not found", () => {
    expect(
      parseServingsMetaVar("title: My Recipe", "servings"),
    ).toBeUndefined();
  });
});

describe("parseYieldMetaVar", () => {
  it("should parse plain quantity without unit", () => {
    expect(parseYieldMetaVar("yield: 6")).toEqual<Yield>({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 6 } },
    });
  });
  it("should parse plain quantity with unit", () => {
    expect(parseYieldMetaVar("yield: 300%g")).toEqual<Yield>({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 300 } },
      unit: "g",
    });
  });
  it("should parse full-width quantity punctuation and digits", () => {
    expect(parseYieldMetaVar("yield：３００％g")).toEqual<Yield>({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 300 } },
      unit: "g",
    });
  });
  it("should parse plain fraction quantity with unit", () => {
    expect(parseYieldMetaVar("yield: 1/2%kg")).toEqual<Yield>({
      quantity: { type: "fixed", value: { type: "fraction", num: 1, den: 2 } },
      unit: "kg",
    });
  });
  it("should parse complex format with unit and prefix", () => {
    expect(parseYieldMetaVar("yield: about {{3%kg}}")).toEqual<Yield>({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 3 } },
      unit: "kg",
      textBefore: "about",
    });
  });
  it("should parse complex format with unit and suffix", () => {
    expect(parseYieldMetaVar("yield: {{1.5%kg}} of bread")).toEqual<Yield>({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1.5 } },
      unit: "kg",
      textAfter: "of bread",
    });
  });
  it("should parse complex format with unit, prefix and suffix", () => {
    expect(parseYieldMetaVar("yield: about {{3%kg}} of bread")).toEqual<Yield>({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 3 } },
      unit: "kg",
      textBefore: "about",
      textAfter: "of bread",
    });
  });
  it("should parse complex format without unit", () => {
    expect(parseYieldMetaVar("yield: {{3}}")).toEqual<Yield>({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 3 } },
    });
  });
  it("should return undefined when not found", () => {
    expect(parseYieldMetaVar("title: My Recipe")).toBeUndefined();
  });
  it("should return undefined when only a unit is provided (no quantity)", () => {
    expect(parseYieldMetaVar("yield: %g")).toBeUndefined();
  });
  it("should parse non-numeric yield as text value", () => {
    expect(parseYieldMetaVar("yield: some text")).toEqual<Yield>({
      quantity: { type: "fixed", value: { type: "text", text: "some text" } },
    });
  });
});

describe("parseArbitraryQuantity", () => {
  it("should parse a quantity with unit", () => {
    expect(parseArbitraryQuantity("300%g")).toEqual({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 300 } },
      unit: "g",
    });
  });
  it("should parse full-width quantity punctuation and digits", () => {
    expect(parseArbitraryQuantity("３００％g")).toEqual({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 300 } },
      unit: "g",
    });
  });
  it("should parse a quantity without unit", () => {
    expect(parseArbitraryQuantity("5")).toEqual({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 5 } },
    });
  });
  it("should throw on empty input", () => {
    expect(() => parseArbitraryQuantity("")).toThrowError(
      "Arbitrary quantities must have a numerical value",
    );
  });
  it("should throw on text-only value", () => {
    expect(() => parseArbitraryQuantity("some%kg")).toThrowError(
      "Arbitrary quantities must have a numerical value",
    );
  });
  it("should parse a range with unit", () => {
    expect(parseArbitraryQuantity("1-2%kg")).toEqual({
      quantity: {
        type: "range",
        min: { type: "decimal", decimal: 1 },
        max: { type: "decimal", decimal: 2 },
      },
      unit: "kg",
    });
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

describe("parseMarkdownSegments", () => {
  it("should return a single plain TextItem for text without markdown", () => {
    expect(parseMarkdownSegments("just plain text")).toEqual<TextItem[]>([
      { type: "text", value: "just plain text" },
    ]);
  });

  it("should return empty array for empty string", () => {
    expect(parseMarkdownSegments("")).toEqual<TextItem[]>([]);
  });

  // Bold
  it("should parse **bold** with asterisks", () => {
    expect(parseMarkdownSegments("some **bold** text")).toEqual<TextItem[]>([
      { type: "text", value: "some " },
      { type: "text", value: "bold", attribute: "bold" },
      { type: "text", value: " text" },
    ]);
  });

  it("should parse __bold__ with underscores at word boundaries", () => {
    expect(parseMarkdownSegments("some __bold__ text")).toEqual<TextItem[]>([
      { type: "text", value: "some " },
      { type: "text", value: "bold", attribute: "bold" },
      { type: "text", value: " text" },
    ]);
  });

  it("should not parse __underscores__ inside words", () => {
    expect(parseMarkdownSegments("foo__bar__baz")).toEqual<TextItem[]>([
      { type: "text", value: "foo__bar__baz" },
    ]);
  });

  // Italic
  it("should parse *italic* with asterisks", () => {
    expect(parseMarkdownSegments("some *italic* text")).toEqual<TextItem[]>([
      { type: "text", value: "some " },
      { type: "text", value: "italic", attribute: "italic" },
      { type: "text", value: " text" },
    ]);
  });

  it("should parse _italic_ with underscores at word boundaries", () => {
    expect(parseMarkdownSegments("some _italic_ text")).toEqual<TextItem[]>([
      { type: "text", value: "some " },
      { type: "text", value: "italic", attribute: "italic" },
      { type: "text", value: " text" },
    ]);
  });

  it("should not parse _underscores_ inside words", () => {
    expect(parseMarkdownSegments("foo_bar_baz")).toEqual<TextItem[]>([
      { type: "text", value: "foo_bar_baz" },
    ]);
  });

  // Bold+Italic
  it("should parse ***bold+italic*** with triple asterisks", () => {
    expect(parseMarkdownSegments("some ***strong*** text")).toEqual<TextItem[]>(
      [
        { type: "text", value: "some " },
        { type: "text", value: "strong", attribute: "bold+italic" },
        { type: "text", value: " text" },
      ],
    );
  });

  it("should parse ___bold+italic___ with triple underscores", () => {
    expect(parseMarkdownSegments("some ___strong___ text")).toEqual<TextItem[]>(
      [
        { type: "text", value: "some " },
        { type: "text", value: "strong", attribute: "bold+italic" },
        { type: "text", value: " text" },
      ],
    );
  });

  it("should parse **_bold+italic_** with mixed markers", () => {
    expect(parseMarkdownSegments("some **_strong_** text")).toEqual<TextItem[]>(
      [
        { type: "text", value: "some " },
        { type: "text", value: "strong", attribute: "bold+italic" },
        { type: "text", value: " text" },
      ],
    );
  });

  it("should parse __*bold+italic*__ with mixed markers", () => {
    expect(parseMarkdownSegments("some __*strong*__ text")).toEqual<TextItem[]>(
      [
        { type: "text", value: "some " },
        { type: "text", value: "strong", attribute: "bold+italic" },
        { type: "text", value: " text" },
      ],
    );
  });

  it("should parse *__bold+italic__* with mixed markers", () => {
    expect(parseMarkdownSegments("some *__strong__* text")).toEqual<TextItem[]>(
      [
        { type: "text", value: "some " },
        { type: "text", value: "strong", attribute: "bold+italic" },
        { type: "text", value: " text" },
      ],
    );
  });

  it("should parse _**bold+italic**_ with mixed markers", () => {
    expect(parseMarkdownSegments("some _**strong**_ text")).toEqual<TextItem[]>(
      [
        { type: "text", value: "some " },
        { type: "text", value: "strong", attribute: "bold+italic" },
        { type: "text", value: " text" },
      ],
    );
  });

  // Links
  it("should parse [text](url) links", () => {
    expect(
      parseMarkdownSegments("see [my recipe](https://example.com) here"),
    ).toEqual<TextItem[]>([
      { type: "text", value: "see " },
      {
        type: "text",
        value: "my recipe",
        attribute: "link",
        href: "https://example.com",
      },
      { type: "text", value: " here" },
    ]);
  });

  // Inline code
  it("should parse `inline code`", () => {
    expect(parseMarkdownSegments("set to `180°C` now")).toEqual<TextItem[]>([
      { type: "text", value: "set to " },
      { type: "text", value: "180°C", attribute: "code" },
      { type: "text", value: " now" },
    ]);
  });

  // Escaping
  it("should handle escaped asterisks", () => {
    expect(parseMarkdownSegments("not \\*bold\\* here")).toEqual<TextItem[]>([
      { type: "text", value: "not " },
      { type: "text", value: "*" },
      { type: "text", value: "bold" },
      { type: "text", value: "*" },
      { type: "text", value: " here" },
    ]);
  });

  it("should handle escaped underscores", () => {
    expect(parseMarkdownSegments("not \\_italic\\_ here")).toEqual<TextItem[]>([
      { type: "text", value: "not " },
      { type: "text", value: "_" },
      { type: "text", value: "italic" },
      { type: "text", value: "_" },
      { type: "text", value: " here" },
    ]);
  });

  it("should handle escaped backticks", () => {
    expect(parseMarkdownSegments("not \\`code\\` here")).toEqual<TextItem[]>([
      { type: "text", value: "not " },
      { type: "text", value: "`" },
      { type: "text", value: "code" },
      { type: "text", value: "`" },
      { type: "text", value: " here" },
    ]);
  });

  // Multiple segments
  it("should handle multiple formatted segments in one string", () => {
    expect(parseMarkdownSegments("mix **well** then *gently* fold")).toEqual<
      TextItem[]
    >([
      { type: "text", value: "mix " },
      { type: "text", value: "well", attribute: "bold" },
      { type: "text", value: " then " },
      { type: "text", value: "gently", attribute: "italic" },
      { type: "text", value: " fold" },
    ]);
  });

  // Edge: only formatted
  it("should handle text that is entirely formatted", () => {
    expect(parseMarkdownSegments("**all bold**")).toEqual<TextItem[]>([
      { type: "text", value: "all bold", attribute: "bold" },
    ]);
  });
});

describe("parseBlockScalarMetaVar", () => {
  it("should parse literal block scalar (|) preserving newlines", () => {
    const content = `description: |
  Line one
  Line two
  Line three`;
    expect(parseBlockScalarMetaVar(content, "description")).toEqual(
      "Line one\nLine two\nLine three",
    );
  });

  it("should parse folded block scalar (>) folding newlines into spaces", () => {
    const content = `description: >
  This is a long
  description that
  spans multiple lines`;
    expect(parseBlockScalarMetaVar(content, "description")).toEqual(
      "This is a long description that spans multiple lines",
    );
  });

  it("should preserve paragraph breaks in folded block scalar (>)", () => {
    const content = `description: >
  First paragraph
  continues here

  Second paragraph
  continues here`;
    expect(parseBlockScalarMetaVar(content, "description")).toEqual(
      "First paragraph continues here\nSecond paragraph continues here",
    );
  });

  it("should return undefined when no block scalar is present", () => {
    expect(
      parseBlockScalarMetaVar("description: simple text", "description"),
    ).toBeUndefined();
  });

  it("should return undefined when block scalar is empty", () => {
    const content = `description: |
  
`;
    expect(parseBlockScalarMetaVar(content, "description")).toBeUndefined();
  });

  it("should return undefined when the key does not exist", () => {
    expect(
      parseBlockScalarMetaVar("title: something", "description"),
    ).toBeUndefined();
  });

  it("should strip trailing empty lines", () => {
    const content = `description: |
  Line one
  Line two

`;
    expect(parseBlockScalarMetaVar(content, "description")).toEqual(
      "Line one\nLine two",
    );
  });

  it("should work with introduction field", () => {
    const content = `introduction: >
  Welcome to this recipe.
  It is very delicious.`;
    expect(parseBlockScalarMetaVar(content, "introduction")).toEqual(
      "Welcome to this recipe. It is very delicious.",
    );
  });
});

describe("extractMetadata", () => {
  it("should return an empty object if no metadata block is present", () => {
    const content = "Just some recipe content without metadata.";
    expect(extractMetadata(content)).toEqual({ metadata: {} });
  });

  it("should parse full-width separators and digits in metadata", () => {
    const content = `---
servings：２
yield：３００％g
time：１時間 ３０分
---`;
    expect(extractMetadata(content)).toEqual<MetadataExtract>({
      metadata: {
        servings: 2,
        yield: {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 300 } },
          unit: "g",
        },
        time: {
          total: 90,
        },
      },
      servings: 2,
    });
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
        servings: 2,
      },
      servings: 2,
    };
    expect(extractMetadata(content_canonical)).toEqual(expected_canonical);
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
        servings: 2,
        tags: ["one", "two", "three"],
      },
      servings: 2,
    };
    expect(extractMetadata(content)).toEqual(expected);
  });

  it("should handle detailed source information", () => {
    const contentDot = `
---
source.name: NYT Cooking
source.url: https://cooking.nytimes.com
source.author: Melissa Clark
---
`;
    const contentNested = `
---
source:
  name: NYT Cooking
  url: https://cooking.nytimes.com
  author: Melissa Clark
---
`;
    const expected: MetadataExtract = {
      metadata: {
        source: {
          name: "NYT Cooking",
          url: "https://cooking.nytimes.com",
          author: "Melissa Clark",
        },
      },
    };
    expect(extractMetadata(contentDot)).toEqual(expected);
    expect(extractMetadata(contentNested)).toEqual(expected);
  });

  it("should handle all possible passthrough metadata fields", () => {
    const content = `
---
title: Sheet-Pan Baked Feta With Broccolini, Tomatoes and Lemon
tags: [dinner, oven-only]
source: https://cooking.nytimes.com/recipes/1021277-sheet-pan-baked-feta-with-broccolini-tomatoes-and-lemon
author: Yasmin Fahr
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
        time: {
          prep: 10,
          cook: 15,
          total: 25,
        },
        difficulty: "easy",
        cuisine: "continental",
        diet: "vegan",
        description: "A very easy sheet pan dinner from the New York Times",
        images: [
          "https://static01.nyt.com/images/2021/12/28/dining/yf-baked-feta/yf-baked-feta-master768.jpg?quality=75&auto=webp",
        ],
      },
    };
    expect(extractMetadata(content)).toEqual(expected);
  });

  it("should accept known unit systems", () => {
    const content_metric = `
---
unit system: metric
---`;
    const expected: MetadataExtract = {
      metadata: {
        unitSystem: "metric",
      },
      unitSystem: "metric",
    };
    expect(extractMetadata(content_metric)).toEqual(expected);
  });

  it("should accept unit systems case-insensitively", () => {
    expect(extractMetadata("---\nunit system: METRIC\n---")).toEqual({
      metadata: { unitSystem: "METRIC" },
      unitSystem: "metric",
    });
    expect(extractMetadata("---\nunit system: Metric\n---")).toEqual({
      metadata: { unitSystem: "Metric" },
      unitSystem: "metric",
    });
    expect(extractMetadata("---\nunit system: us\n---")).toEqual({
      metadata: { unitSystem: "us" },
      unitSystem: "US",
    });
    expect(extractMetadata("---\nunit system: Us\n---")).toEqual({
      metadata: { unitSystem: "Us" },
      unitSystem: "US",
    });
    expect(extractMetadata("---\nunit system: uk\n---")).toEqual({
      metadata: { unitSystem: "uk" },
      unitSystem: "UK",
    });
    expect(extractMetadata("---\nunit system: jp\n---")).toEqual({
      metadata: { unitSystem: "jp" },
      unitSystem: "JP",
    });
  });

  it("should store unknown unit systems in metadata but not normalize", () => {
    const content_unknown = `
---
unit system: unknown
---`;
    expect(extractMetadata(content_unknown)).toEqual({
      metadata: { unitSystem: "unknown" },
    });
  });

  it("should parse description with literal block scalar (|)", () => {
    const content = `---
description: |
  This is a multi-line
  description that preserves
  newlines.
---`;
    expect(extractMetadata(content)).toEqual<MetadataExtract>({
      metadata: {
        description:
          "This is a multi-line\ndescription that preserves\nnewlines.",
      },
    });
  });

  it("should parse description with folded block scalar (>)", () => {
    const content = `---
description: >
  This is a multi-line
  description that folds
  into one paragraph.
---`;
    expect(extractMetadata(content)).toEqual<MetadataExtract>({
      metadata: {
        description:
          "This is a multi-line description that folds into one paragraph.",
      },
    });
  });

  it("should parse introduction with literal block scalar (|)", () => {
    const content = `---
introduction: |
  Welcome to this recipe.
  It has multiple steps.
---`;
    expect(extractMetadata(content)).toEqual<MetadataExtract>({
      metadata: {
        introduction: "Welcome to this recipe.\nIt has multiple steps.",
      },
    });
  });

  it("should parse introduction with folded block scalar (>)", () => {
    const content = `---
introduction: >
  Welcome to this recipe.
  It has multiple steps.
---`;
    expect(extractMetadata(content)).toEqual<MetadataExtract>({
      metadata: {
        introduction: "Welcome to this recipe. It has multiple steps.",
      },
    });
  });

  it("should still parse description as simple string when no block scalar", () => {
    const content = `---
description: A simple description
---`;
    expect(extractMetadata(content)).toEqual<MetadataExtract>({
      metadata: {
        description: "A simple description",
      },
    });
  });
});

describe("flushPendingNote", () => {
  it("should add a note to the section if the note is not empty", () => {
    const section = new SectionObject("Test Section");
    const note: NoteItem[] = [{ type: "text", value: "This is a test note." }];

    const result = flushPendingNote(section, note);

    expect(section.content).toHaveLength(1);
    expect(section.content[0]).toEqual({
      type: "note",
      items: [{ type: "text", value: "This is a test note." }],
    });
    expect(result).toEqual([]);
  });

  it("should not add a note if it is empty and return an empty array", () => {
    const section = new SectionObject("Test Section");
    const note: NoteItem[] = [];

    const result = flushPendingNote(section, note);

    expect(section.content).toHaveLength(0);
    expect(result).toEqual([]);
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
    expect(findAndUpsertCookware(cookware, newCookware, false)).toBe(1);
    expect(cookware.length).toEqual(2);
  });

  it("should correctly add a referenced cookware", () => {
    const cookware: Cookware[] = [{ name: "oven", flags: [] }];
    const newCookware: Cookware = {
      name: "oven",
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
      flags: [],
    };
    expect(findAndUpsertCookware(cookware, newCookware, true)).toBe(0);
    expect(cookware.length).toBe(1);
    expect(cookware[0]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", decimal: 1 },
    });
  });

  it("should add quantities of referenced cookware", () => {
    const cookware: Cookware[] = [
      {
        name: "oven",
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        flags: [],
      },
    ];
    const newCookware: Cookware = {
      name: "oven",
      quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
      flags: [],
    };
    findAndUpsertCookware(cookware, newCookware, true);
    expect(cookware[0]!.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", decimal: 3 },
    });
  });

  it("should insert a new cookware if the referenced one has a text quantity", () => {
    const cookware: Cookware[] = [
      {
        name: "oven",
        quantity: { type: "fixed", value: { type: "text", text: "one" } },
        flags: [],
      },
    ];
    const newCookware: Cookware = {
      name: "oven",
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
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

  it("should throw an error if flags differ in referenced cookware", () => {
    const cookware: Cookware[] = [
      {
        name: "oven",
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        flags: ["hidden"],
      },
    ];
    const newCookware: Cookware = {
      name: "oven",
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
    };

    expect(() => findAndUpsertCookware(cookware, newCookware, true)).toThrow(
      ReferencedItemCannotBeRedefinedError,
    );
    newCookware.flags = ["optional"];
    expect(() => findAndUpsertCookware(cookware, newCookware, true)).toThrow(
      ReferencedItemCannotBeRedefinedError,
    );
  });
});

describe("findAndUpsertIngredient", () => {
  it("should correctly add a non-referenced ingredient", () => {
    const ingredients: Ingredient[] = [];
    const newIngredient: Ingredient = {
      name: "eggs",
      quantities: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        },
      ],
    };
    expect(findAndUpsertIngredient(ingredients, newIngredient, false)).toEqual(
      0,
    );
    expect(ingredients).toEqual([newIngredient]);
  });

  it("should correctly add a referenced ingredient", () => {
    const ingredients: Ingredient[] = [
      {
        name: "eggs",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1 },
            },
          },
        ],
      },
    ];
    const newIngredient: Ingredient = {
      name: "eggs",
      quantities: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
        },
      ],
    };
    expect(findAndUpsertIngredient(ingredients, newIngredient, true)).toEqual(
      0,
    );
    expect(ingredients[0]!.quantities).toEqual([
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
      },
    ]);

    const ingredients_noqtt: Ingredient[] = [{ name: "salt" }];
    const newIngredient_noqtt: Ingredient = { name: "salt" };
    expect(
      findAndUpsertIngredient(ingredients_noqtt, newIngredient_noqtt, true),
    ).toEqual(0);
    expect(ingredients_noqtt[0]!.quantities).toBe(undefined);
  });

  it("should return index of referenced ingredient even if it has a text quantity", () => {
    const ingredients: Ingredient[] = [
      {
        name: "eggs",
        quantities: [
          {
            quantity: { type: "fixed", value: { type: "text", text: "one" } },
          },
        ],
      },
    ];
    const newIngredient: Ingredient = {
      name: "eggs",
      quantities: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        },
      ],
    };
    expect(findAndUpsertIngredient(ingredients, newIngredient, true)).toEqual(
      0,
    );
    expect(ingredients).toHaveLength(1);
  });

  it("should throw an error if an non-existing ingredient is referenced", () => {
    const ingredients: Ingredient[] = [
      {
        name: "eggs",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1 },
            },
          },
        ],
      },
    ];
    const newIngredient: Ingredient = {
      name: "unreferenced-ingredient",
      quantities: [
        {
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 100 },
          },
          unit: "g",
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

  it("should throw an error if flags differ in referenced ingredient", () => {
    const ingredients: Ingredient[] = [
      {
        name: "eggs",
        quantities: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1 },
            },
          },
        ],
        flags: ["hidden"],
      },
    ];
    const newIngredient: Ingredient = {
      name: "eggs",
      quantities: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
        },
      ],
    };
    expect(() =>
      findAndUpsertIngredient(ingredients, newIngredient, true),
    ).toThrow(ReferencedItemCannotBeRedefinedError);
    newIngredient.flags = ["optional"];
    expect(() =>
      findAndUpsertIngredient(ingredients, newIngredient, true),
    ).toThrow(ReferencedItemCannotBeRedefinedError);
  });
});

describe("parseFixedValue", () => {
  it("parses non numerical value as text", () => {
    expect(parseFixedValue("1-ish")).toEqual({ type: "text", text: "1-ish" });
  });

  it("parses fractions as such", () => {
    expect(parseFixedValue("1/2")).toEqual({
      type: "fraction",
      num: 1,
      den: 2,
    });
  });

  it("parses decimal values as such", () => {
    expect(parseFixedValue("1.5")).toEqual({ type: "decimal", decimal: 1.5 });
    expect(parseFixedValue("0.1")).toEqual({ type: "decimal", decimal: 0.1 });
    expect(parseFixedValue("1")).toEqual({ type: "decimal", decimal: 1 });
  });
});

describe("parseQuantityValue", () => {
  it("correctly parses ranges", () => {
    expect(parseQuantityValue("1-2")).toEqual({
      type: "range",
      min: { type: "decimal", decimal: 1 },
      max: { type: "decimal", decimal: 2 },
    });
    expect(parseQuantityValue("1/2-1")).toEqual({
      type: "range",
      min: { type: "fraction", num: 1, den: 2 },
      max: { type: "decimal", decimal: 1 },
    });
    expect(parseQuantityValue("１－２")).toEqual({
      type: "range",
      min: { type: "decimal", decimal: 1 },
      max: { type: "decimal", decimal: 2 },
    });
  });

  it("correctly parses fixed values", () => {
    expect(parseQuantityValue("1")).toEqual({
      type: "fixed",
      value: { type: "decimal", decimal: 1 },
    });
    expect(parseQuantityValue("1.2")).toEqual({
      type: "fixed",
      value: { type: "decimal", decimal: 1.2 },
    });
    expect(parseQuantityValue("１．２")).toEqual({
      type: "fixed",
      value: { type: "decimal", decimal: 1.2 },
    });
  });
});

describe("stringifyQuantityValue", () => {
  it("correctly stringify fixed values", () => {
    expect(
      stringifyQuantityValue({
        type: "fixed",
        value: { type: "decimal", decimal: 1.5 },
      }),
    ).toEqual("1.5");
    expect(
      stringifyQuantityValue({
        type: "fixed",
        value: { type: "fraction", num: 2, den: 3 },
      }),
    ).toEqual("2/3");
    expect(
      stringifyQuantityValue({
        type: "fixed",
        value: { type: "text", text: "a pinch" },
      }),
    ).toEqual("a pinch");
  });

  it("correctly stringify ranges", () => {
    expect(
      stringifyQuantityValue({
        type: "range",
        min: { type: "decimal", decimal: 1 },
        max: { type: "decimal", decimal: 2 },
      }),
    ).toEqual("1-2");
  });
});

describe("unionOfSets", () => {
  it("should return the correct union of two sets", () => {
    expect(
      unionOfSets(new Set(["a", "b", "c"]), new Set(["b", "c", "d", "e"])),
    ).toEqual(new Set(["a", "b", "c", "d", "e"]));
  });
});

describe("parseNestedBlock", () => {
  it("should return undefined when there's no line to parse", () => {
    const testString = `
    
    `;
    expect(parseNestedBlock(testString)).toBeUndefined();
  });

  it("should skip lines that are not in key: value format", () => {
    const testString = `
key: value
anotherKey
aThirdKey: yeah
`;
    expect(parseNestedBlock(testString)).toEqual({
      key: "value",
      aThirdKey: "yeah",
    });
  });

  it("should return undefined when content is a list", () => {
    const testString = `
    - item 1
    - item 2
    `;
    expect(parseNestedBlock(testString)).toBeUndefined();
  });
});

describe("parseNestedMetaVar", () => {
  it("should parse nested metadata variables correctly", () => {
    const testString = `meta: 
  key: value
  anotherKey: 
    nestedKey: nestedValue`;
    const result = parseNestedMetaVar(testString, "meta");
    expect(result).toEqual({
      key: "value",
      anotherKey: {
        nestedKey: "nestedValue",
      },
    });
  });

  it("does not allow tab as indent", () => {
    const testString = `meta: 
 \tkey: value 
`;
    const testString2 = `meta: 
  key: value 
 \tanotherKey: anotherValue
`;
    expect(() => parseNestedMetaVar(testString, "meta")).toThrow(
      NoTabAsIndentError,
    );
    expect(() => parseNestedMetaVar(testString2, "meta")).toThrow(
      NoTabAsIndentError,
    );
  });

  it("ends block when smaller indent is encountered", () => {
    const testString = `meta: 
  key: value
 hide: true
  anotherKey: anotherValue 
`;
    expect(parseNestedMetaVar(testString, "meta")).toEqual({
      key: "value",
    });
  });

  it("should throw an error if the indentation is different", () => {
    const testString = `meta: 
  key: value
   hide: true
`;
    expect(() => parseNestedMetaVar(testString, "meta")).toThrow(
      BadIndentationError,
    );
  });

  it("should parse array values", () => {
    const testString = `meta: 
  key:
    - 1
    - 2
`;
    expect(parseNestedMetaVar(testString, "meta")).toEqual({
      key: [1, 2],
    });
  });

  it("should return undefined when key is not found", () => {
    const testString = `other: value`;
    expect(parseNestedMetaVar(testString, "meta")).toBeUndefined();
  });

  it("should return undefined when key has simple value (not nested)", () => {
    const testString = `meta: simple value`;
    expect(parseNestedMetaVar(testString, "meta")).toBeUndefined();
  });

  it("should parse numeric values in nested objects", () => {
    const testString = `config:
  count: 42
  ratio: 3.14
  negative: -5`;
    const result = parseNestedMetaVar(testString, "config");
    expect(result).toEqual({
      count: 42,
      ratio: 3.14,
      negative: -5,
    });
  });

  it("should parse inline arrays in nested objects", () => {
    const testString = `settings:
  items: [one, two, three]
  enabled: true`;
    const result = parseNestedMetaVar(testString, "settings");
    expect(result).toEqual({
      items: ["one", "two", "three"],
      enabled: "true",
    });
  });

  it("should handle deeply nested objects (3+ levels)", () => {
    const testString = `root:
  level1:
    level2:
      level3: deep value`;
    const result = parseNestedMetaVar(testString, "root");
    expect(result).toEqual({
      level1: {
        level2: {
          level3: "deep value",
        },
      },
    });
  });

  it("should handle mixed nesting with siblings", () => {
    const testString = `data:
  simple: value
  nested:
    child: childValue
  another: anotherValue`;
    const result = parseNestedMetaVar(testString, "data");
    expect(result).toEqual({
      simple: "value",
      nested: {
        child: "childValue",
      },
      another: "anotherValue",
    });
  });

  it("should handle keys with special characters", () => {
    const testString = `meta:
  clé française: valeur
  日本語キー: 値`;
    const result = parseNestedMetaVar(testString, "meta");
    expect(result).toEqual({
      "clé française": "valeur",
      日本語キー: "値",
    });
  });

  it("should parse list of objects", () => {
    const testString = `sources:
  - author: First Name
    name: Source recipe
  - author: Second Name
    url: https://www.recipes.com`;
    const result = parseNestedMetaVar(testString, "sources");
    expect(result).toEqual([
      { author: "First Name", name: "Source recipe" },
      { author: "Second Name", url: "https://www.recipes.com" },
    ]);
  });

  it("should parse list of objects with single item", () => {
    const testString = `sources:
  - author: Only Author
    name: Only Source`;
    const result = parseNestedMetaVar(testString, "sources");
    expect(result).toEqual([{ author: "Only Author", name: "Only Source" }]);
  });

  it("should parse list of objects with single property", () => {
    const testString = `sources:
  - author: Only Author
  - name: Only Source
  - empty: `;
    const result = parseNestedMetaVar(testString, "sources");
    expect(result).toEqual([
      { author: "Only Author" },
      { name: "Only Source" },
      { empty: "" },
    ]);
  });
});

describe("extractMetadata - dynamic parsing", () => {
  it("should capture arbitrary string metadata keys", () => {
    const content = `---
customField: custom value
anotherCustom: 
  key: value
  arrayKey: 
    - 1
    - 2
---`;
    const result = extractMetadata(content);
    expect(result.metadata.customField).toBe("custom value");
    expect(result.metadata.anotherCustom).toEqual({
      key: "value",
      arrayKey: [1, 2],
    });
  });

  it("should detect and parse numeric metadata values", () => {
    const content = `---
rating: 5
temperature: 180
price: 12.99
negative: -10
---`;
    const result = extractMetadata(content);
    expect(result.metadata.rating).toBe(5);
    expect(result.metadata.temperature).toBe(180);
    expect(result.metadata.price).toBe(12.99);
    expect(result.metadata.negative).toBe(-10);
  });

  it("should parse inline array metadata values", () => {
    const content = `---
equipment: [oven, pan, spatula]
allergens: [nuts, dairy]
---`;
    const result = extractMetadata(content);
    expect(result.metadata.equipment).toEqual(["oven", "pan", "spatula"]);
    expect(result.metadata.allergens).toEqual(["nuts", "dairy"]);
  });

  it("should parse YAML-style list metadata values", () => {
    const content = `---
steps:
  - prepare
  - cook
  - serve
---`;
    const result = extractMetadata(content);
    expect(result.metadata.steps).toEqual(["prepare", "cook", "serve"]);
  });

  it("should parse time as YAML-style nested object", () => {
    const content = `---
time:
  prep: 15 minutes
  cook: 30 minutes
  total: 45 minutes
---`;
    const result = extractMetadata(content);
    expect(result.metadata.time).toEqual({
      prep: 15,
      cook: 30,
      total: 45,
    });
  });

  it("should prefer YAML nested source over dot-notation", () => {
    const content = `---
source:
  name: Nested Name
  url: https://nested.com
source.name: Dot Name
---`;
    const result = extractMetadata(content);
    expect(result.metadata.source).toEqual({
      name: "Nested Name",
      url: "https://nested.com",
    });
  });

  it("should prefer YAML nested time over legacy keys", () => {
    const content = `---
time:
  prep: 10m
  cook: 20m
prep time: 15m
---`;
    const result = extractMetadata(content);
    expect(result.metadata.time).toEqual({
      prep: 10,
      cook: 20,
    });
  });

  it("should handle mixed known and unknown metadata fields", () => {
    const content = `---
title: Mixed Recipe
customRating: 5
source: https://example.com
customNotes: Some notes
tags: [test]
---`;
    const result = extractMetadata(content);
    expect(result.metadata).toEqual({
      title: "Mixed Recipe",
      customRating: 5,
      source: "https://example.com",
      customNotes: "Some notes",
      tags: ["test"],
    });
  });

  it("should handle keys with spaces", () => {
    const content = `---
my custom field: my value
---`;
    const result = extractMetadata(content);
    expect(result.metadata["my custom field"]).toBe("my value");
  });

  it("should handle keys with unicode characters", () => {
    const content = `---
recette française: délicieuse
料理名: 寿司
---`;
    const result = extractMetadata(content);
    expect(result.metadata["recette française"]).toBe("délicieuse");
    expect(result.metadata["料理名"]).toBe("寿司");
  });

  it("should handle empty nested objects gracefully", () => {
    const content = `---
title: Test
emptyNested:
---`;
    const result = extractMetadata(content);
    expect(result.metadata.title).toBe("Test");
    // Empty nested should not appear or be undefined
    expect(result.metadata.emptyNested).toBeUndefined();
  });

  it("should preserve string values that look numeric but aren't", () => {
    const content = `---
version: 1.0.0
phone: 555-1234
---`;
    const result = extractMetadata(content);
    expect(result.metadata.version).toBe("1.0.0");
    expect(result.metadata.phone).toBe("555-1234");
  });

  it("should convert numeric strings to numbers (including leading zeros)", () => {
    const content = `---
code: 007
count: 42
---`;
    const result = extractMetadata(content);
    // Leading zeros are stripped when converted to number
    expect(result.metadata.code).toBe(7);
    expect(result.metadata.count).toBe(42);
  });

  it("should handle picture as alias for image", () => {
    const content = `---
picture: https://example.com/recipe.jpg
---`;
    const result = extractMetadata(content);
    expect(result.metadata.image).toBe("https://example.com/recipe.jpg");
  });

  it("should handle pictures as alias for images", () => {
    const content = `---
pictures: [https://example.com/a.jpg, https://example.com/b.jpg]
---`;
    const result = extractMetadata(content);
    expect(result.metadata.images).toEqual([
      "https://example.com/a.jpg",
      "https://example.com/b.jpg",
    ]);
  });

  it("should prefer image over picture alias", () => {
    const content = `---
image: https://example.com/image.jpg
picture: https://example.com/picture.jpg
---`;
    const result = extractMetadata(content);
    expect(result.metadata.image).toBe("https://example.com/image.jpg");
  });

  it("should handle partial source fields via dot-notation", () => {
    const content = `---
source.url: https://example.com
---`;
    const result = extractMetadata(content);
    expect(result.metadata.source).toEqual({
      url: "https://example.com",
    });
  });

  it("should handle partial time fields via legacy keys", () => {
    const content = `---
cook time: 30m
---`;
    const result = extractMetadata(content);
    expect(result.metadata.time).toEqual({
      cook: 30,
    });
  });

  it("should parse list of objects in metadata", () => {
    const content = `---
sources:
  - author: First Name
    name: Source recipe
  - author: Second Name
    url: https://www.recipes.com
---`;
    const result = extractMetadata(content);
    expect(result.metadata.sources).toEqual([
      { author: "First Name", name: "Source recipe" },
      { author: "Second Name", url: "https://www.recipes.com" },
    ]);
  });

  it("should handle duration as alias for total time", () => {
    const content = `---
duration: 1 hour
---`;
    const result = extractMetadata(content);
    expect(result.metadata.time).toEqual({
      total: 60,
    });
  });

  it("should fall back to string when time value is not parseable", () => {
    const content = `---
time:
  prep: about an hour
  cook: a day or so
  total: quite a bit
---`;
    const result = extractMetadata(content);
    expect(result.metadata.time).toEqual({
      prep: "about an hour",
      cook: "a day or so",
      total: "quite a bit",
    });
  });

  it("should fall back to string for legacy time keys that are not parseable", () => {
    const content = `---
cook time: a long time
prep time: not sure
time: hours
---`;
    const result = extractMetadata(content);
    expect(result.metadata.time).toEqual({
      cook: "a long time",
      prep: "not sure",
      total: "hours",
    });
  });
});

describe("parseQuantityWithUnit", () => {
  it("should parse value and unit separated by %", () => {
    const result = parseQuantityWithUnit("500%g");
    expect(result.value).toMatchObject({
      type: "fixed",
      value: { type: "decimal", decimal: 500 },
    });
    expect(result.unit).toBe("g");
  });

  it("should parse full-width quantity punctuation and digits", () => {
    const result = parseQuantityWithUnit("５００％g");
    expect(result.value).toMatchObject({
      type: "fixed",
      value: { type: "decimal", decimal: 500 },
    });
    expect(result.unit).toBe("g");
  });

  it("should parse value without unit", () => {
    const result = parseQuantityWithUnit("6");
    expect(result.value).toMatchObject({
      type: "fixed",
      value: { type: "decimal", decimal: 6 },
    });
    expect(result.unit).toBeUndefined();
  });

  it("should handle whitespace around value and unit", () => {
    const result = parseQuantityWithUnit("  500 % g  ");
    expect(result.value).toMatchObject({
      type: "fixed",
      value: { type: "decimal", decimal: 500 },
    });
    expect(result.unit).toBe("g");
  });

  it("should parse fractions with unit", () => {
    const result = parseQuantityWithUnit("1/2%cup");
    expect(result.value).toMatchObject({
      type: "fixed",
      value: { type: "fraction", num: 1, den: 2 },
    });
    expect(result.unit).toBe("cup");
  });

  it("should return undefined unit when % is at the end", () => {
    const result = parseQuantityWithUnit("500%");
    expect(result.unit).toBeUndefined();
  });
});

describe("parseDateFromFormat", () => {
  it("should parse DD.MM.YYYY", () => {
    expect(parseDateFromFormat("15.06.2025", "DD.MM.YYYY")).toEqual(
      new Date(2025, 5, 15),
    );
  });

  it("should parse MM/DD/YYYY", () => {
    expect(parseDateFromFormat("06/15/2025", "MM/DD/YYYY")).toEqual(
      new Date(2025, 5, 15),
    );
  });

  it("should parse YYYY-MM-DD", () => {
    expect(parseDateFromFormat("2025-06-15", "YYYY-MM-DD")).toEqual(
      new Date(2025, 5, 15),
    );
  });

  it("should throw on invalid format (no delimiter)", () => {
    expect(() => parseDateFromFormat("15062025", "DDMMYYYY")).toThrow(
      /No delimiter/,
    );
  });

  it("should throw on wrong number of parts", () => {
    expect(() => parseDateFromFormat("15.06", "DD.MM.YYYY")).toThrow(
      /Expected 3 parts/,
    );
  });

  it("should throw on non-numeric parts", () => {
    expect(() => parseDateFromFormat("abc.06.2025", "DD.MM.YYYY")).toThrow(
      /non-numeric/,
    );
  });

  it("should throw on invalid date (e.g. month 13)", () => {
    expect(() => parseDateFromFormat("15.13.2025", "DD.MM.YYYY")).toThrow(
      /Invalid date/,
    );
  });

  it("should throw on unknown token in format", () => {
    expect(() => parseDateFromFormat("15.06.2025", "DD.XX.YYYY")).toThrow(
      /Unknown token/,
    );
  });
});

describe("parseFuzzyDate", () => {
  it("should parse DD.MM.YYYY", () => {
    expect(parseFuzzyDate("15.06.2025")).toEqual(new Date(2025, 5, 15));
  });

  it("should parse DD/MM/YYYY", () => {
    expect(parseFuzzyDate("15/06/2025")).toEqual(new Date(2025, 5, 15));
  });

  it("should parse YYYY-MM-DD", () => {
    expect(parseFuzzyDate("2025-06-15")).toEqual(new Date(2025, 5, 15));
  });

  it("should parse DD-MM-YYYY", () => {
    expect(parseFuzzyDate("15-06-2025")).toEqual(new Date(2025, 5, 15));
  });

  it("should parse 2-digit year as 20xx", () => {
    expect(parseFuzzyDate("15.06.25")).toEqual(new Date(2025, 5, 15));
  });

  it("should throw on input without delimiter", () => {
    expect(() => parseFuzzyDate("15062025")).toThrow(/no delimiter/);
  });

  it("should throw on input with wrong number of parts", () => {
    expect(() => parseFuzzyDate("15.06")).toThrow(/expected 3 parts/i);
  });

  it("should throw on non-numeric parts", () => {
    expect(() => parseFuzzyDate("abc.06.2025")).toThrow(/non-numeric/);
  });

  it("should throw on invalid date", () => {
    expect(() => parseFuzzyDate("31.13.2025")).toThrow(/Invalid date/);
    expect(() => parseFuzzyDate("31.01.202")).toThrow(/Invalid date/);
  });

  it("should disambiguate month-first when second part > 12", () => {
    // 01/25/2025 → second part (25) > 12, must be day → MM/DD/YYYY
    expect(parseFuzzyDate("01/25/2025")).toEqual(new Date(2025, 0, 25));
  });

  it("should disambiguate month-first with 2-digit year", () => {
    // 01.25.25 → second part (25) > 12, must be day → MM.DD.YY
    expect(parseFuzzyDate("01.25.25")).toEqual(new Date(2025, 0, 25));
  });

  it("should keep day-first when first part > 12", () => {
    // 25.01.2025 → first part (25) > 12, confirms day-first → DD.MM.YYYY
    expect(parseFuzzyDate("25.01.2025")).toEqual(new Date(2025, 0, 25));
  });
});

describe("getNumericValueFromYield", () => {
  it("should handle ranges", () => {
    const yieldVar: Yield = {
      quantity: {
        type: "range",
        min: { type: "decimal", decimal: 1 },
        max: { type: "decimal", decimal: 2 },
      },
    };
    expect(getNumericValueFromYield(yieldVar)).toBe(1);
  });

  it("should default to 1 for text values", () => {
    const yieldVar: Yield = {
      quantity: {
        type: "fixed",
        value: { type: "text", text: "eight" },
      },
    };
    expect(getNumericValueFromYield(yieldVar)).toBe(1);
  });
});
