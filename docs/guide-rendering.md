---
outline: deep
---

# Guide: rendering recipes

This guide walks through displaying parsed recipe data — metadata, preparation steps, ingredient lists, cookware, and timers — using the structured output of the `Recipe` class and the formatting helpers exported by the library.

## Rendering metadata

The [`metadata`](/api/classes/Recipe.html#metadata) property is a [`Metadata`](/api/interfaces/Metadata) object with typed fields for canonical keys and an index signature for custom ones.

```typescript
import { Recipe } from "@tmlmt/cooklang-parser";

const recipe = new Recipe(`---
title: Chocolate Cake
author: Jane Doe
servings: 8
prep time: 20 min
cook time: 35 min
wine pairing: Dry red wine
---
Preheat the oven to 180°C.`);

// Canonical fields
recipe.metadata.title;    // "Chocolate Cake"
recipe.metadata.author;   // "Jane Doe"
recipe.metadata.servings; // 8
recipe.metadata.time;     // { prep: "20 min", cook: "35 min" }

// Custom keys are captured too
recipe.metadata["wine pairing"]; // "Dry red wine"
```

The full list of canonical metadata fields is documented in the [`Metadata`](/api/interfaces/Metadata) interface. For details on how additional metadata, servings/yield behaviour, and block scalar syntax work, see the [Cooklang specs guide](/guide-cooklang-specs#metadata).

## Rendering preparation steps

Recipe content is organized into [`sections`](/api/classes/Recipe.html#sections). Each [`Section`](/api/classes/Section) has a `name` (empty string for the default section) and a `content` array of [`Step`](/api/interfaces/Step) and [`Note`](/api/interfaces/Note) objects.

Each `Step` contains an `items` array of [`StepItem`](/api/type-aliases/StepItem) entries. You iterate over them and render each type:

```typescript
import { Recipe, formatQuantityWithUnit, formatQuantity } from "@tmlmt/cooklang-parser";

const recipe = new Recipe(`Preheat #oven to 180°C.

Whisk @eggs{3} with @flour{100%g} for ~{5%minutes}.`);

for (const section of recipe.sections) {
  if (section.name) {
    console.log(`\n## ${section.name}`);
  }

  for (const block of section.content) {
    if (block.type === "note") {
      // Notes contain only text and arbitrary scalable items
      const text = block.items
        .map((item) => {
          if (item.type === "text") return item.value;
          // Arbitrary scalable
          const arb = recipe.arbitraries[item.index]!;
          return formatQuantityWithUnit(arb.quantity, arb.unit);
        })
        .join("");
      console.log(`> ${text}`);
      continue;
    }

    // block.type === "step"
    const text = block.items
      .map((item) => {
        switch (item.type) {
          case "text": return renderText(item);
          case "ingredient": {
            const alt = item.alternatives[0]!;
            return alt.quantity
              ? `${formatQuantityWithUnit(alt.quantity, alt.unit)} ${alt.displayName}`
              : alt.displayName;
          }
          case "cookware":
            return recipe.cookware[item.index]!.name;
          case "timer": {
            const timer = recipe.timers[item.index]!;
            return `${formatQuantity(timer.duration)} ${timer.unit}`;
          }
          case "arbitrary": {
            const arb = recipe.arbitraries[item.index]!;
            return formatQuantityWithUnit(arb.quantity, arb.unit);
          }
        }
      })
      .join("");

    console.log(text);
  }
}
```

### Step item types

| Type | Description | Reference on item |
|------|-------------|-------------------|
| `text` | Plain or formatted text | `value`, optional `attribute` (`"bold"`, `"italic"`, `"bold+italic"`, `"link"`, `"code"`) and `href` |
| `ingredient` | Ingredient mention | `alternatives[]` with `displayName`, `quantity`, `unit`; see [alternatives](#handling-alternative-selections) |
| `cookware` | Cookware mention | `index` → [`recipe.cookware`](/api/classes/Recipe.html#cookware) |
| `timer` | Timer mention | `index` → [`recipe.timers`](/api/classes/Recipe.html#timers) |
| `arbitrary` | Scalable quantity | `index` → [`recipe.arbitraries`](/api/classes/Recipe.html#arbitraries) |

### Rendering text items with formatting

[`TextItem`](/api/interfaces/TextItem) can carry a formatting `attribute`:

```typescript
import type { TextItem } from "@tmlmt/cooklang-parser";

function renderText(item: TextItem): string {
  switch (item.attribute) {
    case "bold":        return `<strong>${item.value}</strong>`;
    case "italic":      return `<em>${item.value}</em>`;
    case "bold+italic": return `<strong><em>${item.value}</em></strong>`;
    case "link":        return `<a href="${item.href}">${item.value}</a>`;
    case "code":        return `<code>${item.value}</code>`;
    default:            return item.value;
  }
}
```

## Formatting quantities

The library exports a set of functions to turn parsed quantity structures into display strings. They build on each other from low-level to high-level:

### Low-level: numeric values

| Function | Input | Example |
|----------|-------|---------|
| [`renderFractionAsVulgar(num, den)`](/api/functions/renderFractionAsVulgar) | numerator + denominator | `renderFractionAsVulgar(1, 2)` → `"½"` |
| [`formatNumericValue(value, useVulgar?)`](/api/functions/formatNumericValue) | `DecimalValue` or `FractionValue` | `formatNumericValue({ type: "fraction", num: 3, den: 4 })` → `"¾"` |
| [`formatSingleValue(value)`](/api/functions/formatSingleValue) | `TextValue`, `DecimalValue`, or `FractionValue` | `formatSingleValue({ type: "text", text: "a pinch" })` → `"a pinch"` |

### Mid-level: quantities and units

| Function | Input | Example |
|----------|-------|---------|
| [`formatQuantity(quantity)`](/api/functions/formatQuantity) | `FixedValue` or `Range` | `formatQuantity({ type: "fixed", value: { type: "decimal", decimal: 100 } })` → `"100"` |
| [`formatUnit(unit)`](/api/functions/formatUnit) | `string`, `Unit`, or `undefined` | `formatUnit({ name: "grams" })` → `"grams"` |
| [`formatQuantityWithUnit(quantity, unit)`](/api/functions/formatQuantityWithUnit) | quantity + unit | `formatQuantityWithUnit(quantity, "g")` → `"100 g"` |

### High-level: compound quantities

| Function | Input | Example |
|----------|-------|---------|
| [`formatExtendedQuantity(item)`](/api/functions/formatExtendedQuantity) | `QuantityWithExtendedUnit` | Formats a quantity–unit pair from extended unit items |
| [`formatItemQuantity(itemQuantity, separator?)`](/api/functions/formatItemQuantity) | `MaybeScalableQuantity` | `formatItemQuantity(itemQty)` → `"100 g \| 3.5 oz"` (includes equivalents) |

`formatItemQuantity` is especially useful when rendering ingredient mentions in steps, as it handles both the primary quantity and its equivalents in one call.

## Rendering the ingredient list

Use [`getIngredientQuantities()`](/api/classes/Recipe.html#getingredientquantities) to get the aggregated ingredient list with resolved quantities. It returns an array of [`Ingredient`](/api/interfaces/Ingredient) objects.

```typescript
const recipe = new Recipe(`---
servings: 2
---
Add @flour{200%g} and @flour{100%g}.
Add @salt{1%pinch}.`);

const ingredients = recipe.getIngredientQuantities();
// [
//   { name: "flour", quantities: [{ quantity: ..300g.., unit: "g" }], usedAsPrimary: true },
//   { name: "salt", quantities: [{ quantity: ..1 pinch.., unit: "pinch" }], usedAsPrimary: true },
// ]
```

### Filtering by section or step

Pass a `section` and/or `step` option (as an index or object) to narrow the result:

```typescript
// Ingredients used in the first section only
recipe.getIngredientQuantities({ section: 0 });

// Ingredients used in the second step of the first section
recipe.getIngredientQuantities({ section: 0, step: 1 });
```

### Applying choices

When a recipe contains [alternative ingredients](/guide-extensions#alternatives), `getIngredientQuantities()` needs to know which alternative the user has selected. By default (no `choices` option), it uses the primary alternative — the first inline alternative, or the first subgroup for grouped alternatives.

To select a different alternative, pass a [`RecipeChoices`](/api/interfaces/RecipeChoices) object. It maps item or group IDs to the index of the selected option:

```typescript
// Select the second inline alternative for a specific item
const choices: RecipeChoices = {
  ingredientItems: new Map([["ingredient-item-0", 1]]),
};

// Select subgroup index 1 for a grouped alternative
choices.ingredientGroups = new Map([["flour", 1]]);

const ingredients = recipe.getIngredientQuantities({ choices });
```

The available choices are exposed in [`recipe.choices`](/api/classes/Recipe.html#choices) as a [`RecipeAlternatives`](/api/interfaces/RecipeAlternatives) object:

- `ingredientItems` — `Map<itemId, IngredientAlternative[]>` for inline alternatives. Each entry in the array is one option the user can pick. The map key is the `IngredientItem.id` (e.g. `"ingredient-item-0"`).
- `ingredientGroups` — `Map<groupId, IngredientAlternative[][]>` for grouped alternatives. The map key is the group name (e.g. `"flour"` from `@|flour|...`). The outer array contains subgroups — each subgroup is a selectable unit. The inner array holds the individual ingredients bound together within that subgroup (e.g. `@|flour/alt|flour` and `@|flour/alt|maizena` share subgroup key `"alt"` and appear in the same inner array). The user selects a subgroup index, and all ingredients in it become active.
- `variants` — list of discovered variant names.

Note that the subgroup string keys from the cooklang syntax (the `"1"`, `"alt"` in `@|flour/1|... or @|flour/alt|...`) are only used during parsing to group ingredients together. Downstream, everything works with positional indices into the `IngredientAlternative[][]` array.

When a [variant](/guide-extensions#variants) is active, use [`getEffectiveChoices()`](/api/functions/getEffectiveChoices) to auto-build a `RecipeChoices` that selects alternatives whose `note` matches the variant name:

```typescript
import { getEffectiveChoices } from "@tmlmt/cooklang-parser";

const choices = getEffectiveChoices(recipe, "vegan");
const ingredients = recipe.getIngredientQuantities({ choices });
```

### Quantity group types

Each ingredient's `quantities` array contains groups that come in two forms:

- **Simple group** ([`IngredientQuantityGroup`](/api/interfaces/IngredientQuantityGroup)) — a single quantity/unit pair. Test with [`isSimpleGroup()`](/api/functions/isSimpleGroup).
- **AND group** ([`IngredientQuantityAndGroup`](/api/interfaces/IngredientQuantityAndGroup)) — multiple incompatible quantities combined with "and" (e.g. `1 L and 2 buckets` when they couldn't be summed). Test with [`isAndGroup()`](/api/functions/isAndGroup).

Both can carry `alternatives` — test with [`hasAlternatives()`](/api/functions/hasAlternatives).

```typescript
import {
  isSimpleGroup, isAndGroup, hasAlternatives,
  formatQuantityWithUnit
} from "@tmlmt/cooklang-parser";

for (const ingredient of ingredients) {
  if (!ingredient.quantities) {
    console.log(`- ${ingredient.name}`);
    continue;
  }

  for (const group of ingredient.quantities) {
    let qty: string;

    if (isAndGroup(group)) {
      // Multiple incompatible quantities joined with "and"
      qty = group.and.map((g) => formatQuantityWithUnit(g.quantity, g.unit)).join(" and ");
    } else if (isSimpleGroup(group)) {
      qty = formatQuantityWithUnit(group.quantity, group.unit);
    } else {
      continue;
    }

    let line = `- ${qty} ${ingredient.name}`;

    if (hasAlternatives(group)) {
      // group.alternatives is AlternativeIngredientRef[][]
      // outer array = "or" choices, inner array = ingredients within one choice
      const altText = group.alternatives
        .map((subgroup) =>
          subgroup
            .map((ref) => {
              const altName = ingredients.find(
                (_, i) => i === ref.index
              )?.name ?? "?";
              const altQty = ref.quantities
                ?.map((q) => formatQuantityWithUnit(q.quantity, q.unit))
                .join(" and ");
              return altQty ? `${altQty} ${altName}` : altName;
            })
            .join(" + ")
        )
        .join(" or ");
      line += ` (or ${altText})`;
    }

    console.log(line);
  }
}
```

## Rendering cookware and timers

[`cookware`](/api/classes/Recipe.html#cookware) and [`timers`](/api/classes/Recipe.html#timers) are simple arrays on the recipe:

```typescript
// Cookware
for (const cw of recipe.cookware) {
  const qty = cw.quantity ? formatQuantity(cw.quantity) + " " : "";
  const optional = cw.flags?.includes("optional") ? " (optional)" : "";
  console.log(`- ${qty}${cw.name}${optional}`);
}

// Timers
for (const timer of recipe.timers) {
  const name = timer.name ? `${timer.name}: ` : "";
  console.log(`- ${name}${formatQuantity(timer.duration)} ${timer.unit}`);
}
```

## Handling variants

Recipes can define [variants](/guide-extensions#variants) — sections and steps tagged with variant names. The library provides helpers to filter content by the active variant.

### Checking active content

Use [`isSectionActive()`](/api/functions/isSectionActive) and [`isStepActive()`](/api/functions/isStepActive) to determine which content to display:

```typescript
import { Recipe, isSectionActive, isStepActive } from "@tmlmt/cooklang-parser";

const recipe = new Recipe(`Preheat the oven.

[vegan] Use @oat milk{200%mL}.
[*] Use @whole milk{200%mL}.`);

const variant = "vegan"; // or undefined for default

for (const section of recipe.sections) {
  if (!isSectionActive(section, variant)) continue;

  for (const block of section.content) {
    if (block.type === "step" && !isStepActive(block, variant)) continue;
    // render block...
  }
}
```

Both functions follow the same logic:
- Content without a `variants` property is always active
- When no variant is selected, content tagged `[*]` is active
- When a named variant is selected, content whose `variants` array includes that name is active

### Getting effective choices

When a variant is active, ingredient alternatives can be auto-selected too. See [Applying choices](#applying-choices) for the full explanation and examples.

**Auto-selection by note matching:**

Call [`getEffectiveChoices()`](/api/functions/getEffectiveChoices) to auto-build a `RecipeChoices` that selects alternatives whose `note` matches the variant name:

```typescript
import { getEffectiveChoices } from "@tmlmt/cooklang-parser";

const choices = getEffectiveChoices(recipe, "vegan");
const ingredients = recipe.getIngredientQuantities({ choices });
```

**Filtering available choices by variant:**

To show only the ingredient choices available for a given variant in your UI, use the [`getChoicesForVariant()`](/api/classes/Recipe.html#getchoicesforvariant) method on the recipe. It returns a filtered [`RecipeAlternatives`](/api/interfaces/RecipeAlternatives) containing only alternatives that are linked to the active variant (or untagged, making them available in all variants):

```typescript
const variant = "vegan"; // or undefined for default

// Get variant-filtered alternatives
const variantChoices = recipe.getChoicesForVariant(variant);

// variantChoices.ingredientItems contains only alternatives linked to [vegan]
// variantChoices.ingredientGroups contains only grouped alternatives linked to [vegan]
```

## Handling alternative selections

Ingredient alternatives (both [inline](/guide-extensions#inline-alternatives) and [grouped](/guide-extensions#grouped-alternatives)) appear in the step items as an `alternatives` array on [`IngredientItem`](/api/interfaces/IngredientItem).

### Inline vs grouped

Use [`isGroupedItem()`](/api/functions/isGroupedItem) to tell them apart:

- **Inline alternatives** — a single `IngredientItem` with multiple entries in `alternatives`. The user picks one.
- **Grouped alternatives** — multiple `IngredientItem`s scattered across the recipe sharing a `group` key. Each one has a single `alternatives` entry. The user picks which group member is active.

### Determining the selected alternative

Use [`isAlternativeSelected()`](/api/functions/isAlternativeSelected) when rendering step items to decide how to display each alternative:

```typescript
import { Recipe, isAlternativeSelected, isGroupedItem } from "@tmlmt/cooklang-parser";

const recipe = new Recipe(`Add @milk{200%mL} or @oat milk{200%mL}.`);

// User's selection state
const choices = { ingredientItems: new Map([["ingredient-item-0", 1]]) };

for (const item of recipe.sections[0]!.content[0]!.items) {
  if (item.type !== "ingredient") continue;

  if (isGroupedItem(item)) {
    const selected = isAlternativeSelected(recipe, choices, item);
    // For grouped items, the whole item is either selected or not
  } else {
    // Inline: check each alternative
    item.alternatives.forEach((alt, idx) => {
      const selected = isAlternativeSelected(recipe, choices, item, idx);
      // Render with strikethrough, grayed out, etc. if not selected
    });
  }
}
```

For details on the `recipe.choices` structure and how to build `RecipeChoices` objects, see [Applying choices](#applying-choices).
