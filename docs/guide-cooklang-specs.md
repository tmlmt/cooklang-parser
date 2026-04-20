---
outline: deep
---

# Guide: cooklang specifications

This parser library is fully compliant with the Cooklang Specifications that you can read in detail [here](https://cooklang.org/docs/spec/) on _cooklang.org_. 

Below are a few details about some behavioral aspects.

## Ingredients

- For single-word ingredients, the curly braces are optional. For instance, both `@eggs` and `@eggs{}` will be recognized as ingredient "eggs"

- Fractions as quantities will be preserved. For instance, `@water{1/2%L}` will be have its quantity parsed as:

```json
{ type: "fixed", value: {num: 1, den: 2, type: "fraction"}}
```

###  Fixed quantities

Prefixing an ingredient's quantity with `=` will prevent it from scaling. For example, when writing `@salt{=1%pinch}`, salt will always stay at 1 pinch regardless of serving size. 

This does not work with cookware or timers which do not scale anyway.

### Referencing other recipes

It is understood from the [spec](https://cooklang.org/docs/spec/#referencing-other-recipes) that other recipes can be referenced as ingredients by prefixing them with `./` and providing their relative path. For example, `@./sauces/Hollandaise{150%g}`. 

This parser: 
- captures the name of the recipe,
- adds a `recipe` flag to the `flags` array property of the ingredient
- and adds the full relative path including the .cook extension, to the `extras` property of the ingredient.

The above example would therefore result in the following [`Ingredient`](/api/interfaces/Ingredient.html) entry:
```ts
{
  name: "Hollandaise",
  usedAsPrimary: true,
  quantities: [{
    quantity: { type: "fixed", value: { type: "decimal", decimal: 150 } },
    unit: "g"
  }],
  flags: ["recipe"],
  extras: { path: "sauces/Hollandaise.cook" }
}
```

## Metadata

Metadata from the [canonical metadata list](https://cooklang.org/docs/conventions/#canonical-metadata) is parsed with dedicated logic (see in particular the [distinction between scaling variables](#distinction-between-servingsserves-and-yield-metadata-variables) below).

```yaml
---
title: Chocolate Cake
author: Jane Doe
servings: 8
---
```

Any additional metadata keys beyond the canonical list are also captured automatically. They are parsed as YAML objects, lists, numbers, or strings depending on their format.

```yaml
---
wine pairing: Pinot Noir
nutrition:
  calories: 350
  fat: 12g
allergens: [gluten, eggs, dairy]
---
```

Block scalar syntax is supported for multi-line values such as description and introduction. Starting a block with `|` (literal) preserves newlines, while `>` (folded) replaces single newlines with spaces (double newlines are preserved as paragraph breaks). Trailing whitespace is stripped, so these behave like |- and >- in standard YAML. The parser is more lenient than strict YAML with indentation: the indent level is determined by the first non-empty line in the block (minimum one space), and subsequent lines need only be indented by at least that amount.

```yaml
---
description: >
  A rich and moist chocolate cake
  perfect for celebrations.

  Serve with whipped cream.
introduction: |
  Step 1: Preheat the oven.
  Step 2: Mix dry ingredients.
---
```

In this example, description is folded into `A rich and moist chocolate cake perfect for celebrations.\nServe with whipped cream.` (the double newline creates a paragraph break), while introduction preserves its newlines literally as `Step 1: Preheat the oven.\nStep 2: Mix dry ingredients.`

### Distinction between `servings`/`serves` and `yield` metadata variables

Servings-related metadata variables are distinguished to enable settings the value for scaling the recipe separately from its yield, which can now be expressed with a unit (and which gets scaled accordingly).

- `servings`/`serves` can either be provided as a number (which then also sets the recipe's internal `servings` value) or a string (the recipe's internal `servings` is then set to a default value of 1)
- `yield` accepts two different formats to encapsulate a quantity with unit and is parsed as a [Yield](/api/interfaces/Yield) value. If none of these formats are detected, the raw input is interpreted as a [TextValue](/api/interfaces/TextValue) within Yield.quantity. If only `yield` is provided and no `servings`/`serves` the numerical value of the yield variable is used for recipe scaling (defaulting to 1 for raw text)
  - Complex format: <code v-pre>yield: about {{300%g}} of bread</code>
  - Plain format: `yield: 300%g` or `yield: 2`

### Time metadata parsing

Time values (`prep time`, `cook time`, `time required`, `time`, `duration`, or the nested `time:` object with `prep`/`cook`/`total` keys) are parsed into **minutes** as a number. If parsing fails, the raw string is preserved as-is.

Three formats are tried in order:

1. **Plain number** — interpreted as minutes: `30` → `30`, `"30"` → `30`
2. **Compact `DdHhMm`** — no spaces, integers only, case-insensitive:
   `1h` → `60`, `1h30m` → `90`, `1d1h1m` → `1501`
3. **Unit-based** — space-separated `<number><unit>` or `<number> <unit>` pairs (floats allowed). Pairs must be separated by at least one space:
   `1 hour 30 min` → `90`, `1.5 hours` → `90`, `45 secs` → `1` (rounded)

   Recognized units: `s`/`sec`/`secs`/`second`/`seconds`/`seconde`/`secondes`, `m`/`min`/`minute`/`minutes`, `h`/`hour`/`hours`/`heure`/`heures`, `d`/`day`/`days`/`j`/`jour`/`jours`

```yaml
---
time:
  prep: 1h30m       # → 90 (minutes)
  cook: 45 minutes   # → 45
  total: 2h          # → 120
---
```

## Shopping List files

As the basic cooklang specs do not include alternative ingredients or recipe variants, the official cooklang [convention for shopping list file syntax](https://cooklang.org/docs/conventions/#list-definition) does not specify anything in that regard, and does not specify how additional info in general, besides comments can be stored in such file.

This parser chooses to add a yaml frontmatter for this purpose, thereby keeping the core of the file as per the convention.

```yaml
choices:
  "./Complex Recipe":
    variant: spicy
    ingredientItems:
      flour: 1
    ingredientGroups:
      sauce: 0
---
./Complex Recipe{2}
```