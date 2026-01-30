---
outline: deep
---

# Guide: language extensions

This parser library introduces multiple extensions of the original [cooklang language](/guide-cooklang-specs). Half of them are directly inspired by / in line with the extensions proposed by the official ([cooklang-rs](https://github.com/cooklang/cooklang-rs/blob/main/extensions.md)) Rust parser.

List of extensions:

[[toc]]

## Modifiers

One of more prefixes can be added before the ingredient name (`@<modifiers>name{}`) to add metadata to a specific ingredient.

### `&`: reference to an existing ingredient

Use case: `Add @water{1%L} first, and than again @&water{100%mL}` will create one "water" ingredient with a quantity of 1.1L

- The quantities will be added to the ingredient having the same name existing in the `ingredients` list, according to the rules explained in the [unit conversion guide](/guide-unit-conversion)
- The quantity for this specific instance will be saved as part of the item
- If the referenced ingredient is not found or if the quantities cannot be added, a new ingredient will be created

Also work with Cookware

A ingredient reference can optionally include the same flags as the ones in the referenced original ingredient definition, but it cannot contain new flags: 

::: info Good use of extra modifiers to a referenced ingredient
```
Add optionally @?salt{1%pinch} or if you feel generous, @&?salt{1%pinch} extra
Add @pepper{1%pinch} and potentially @?pepper{1%tsp} extra
```
:::

::: danger Incorrect use of modifiers to a referenced ingredient
```
Add @pepper{1%pinch} and potentially @&?pepper{1%tsp} extra
```
:::

### `@`: reference to another recipe

Use case: `Add @@tomato sauce{}` 

Rather than an extension, this modifier is rather an alias to the `./` prefix of the cooklang spec, and the behavior is exactly [the same as for the latter](guide-cooklang-specs.html#referencing-other-recipes). 

### `-`: hidden ingredient

Use case: `Add a bit of @-salt`

`"hidden"` will be added to the ingredient's [`flags`](/api/interfaces/Ingredient.html#flags) property. This can be used later on in your renderer to hide the ingredient from the ingredients list 

Also works with Cookware.

### `?`: optional ingredient

Use case: `You can also add @?parmesan{some}`

`"optional"` will be added to the ingredient's [`flags`](/api/interfaces/Ingredient.html#flags) property. This can be used later on in your renderer to indicate however you want that the ingredient is optional.

Also works with Cookware.

## Range values
   
Usage: `@salt{1-2%pinches}`

The ingredient's quantity will be of type [Range](/api/interfaces/Range) instead of [Fixed Value](/api/interfaces/FixedValue):

```json
{
  type: "range",
  min: { type: "decimal", value: 1 },
  max: { type: "decimal", value: 2 },
}
```

Also compatible with fractions for both or only one end of the range, e.g. `@olive oil{1/4-0.5%tbsp}` will lead to a quantity value of:

```json
{
  type: "range",
  min: { type: "fraction", num: 1, den: 4 },
  max: { type: "decimal", value: 0.5 },
}
```

When referencing ingredients, the added quantities will be converted to [DecimalValue](/api/interfaces/DecimalValue), i.e. fractions will be lost. For example, `@water{1%L} and @&water{1/4-1/2%L}` will show water as an ingredient with a quantity of:

```json
{
  type: "range",
  min: { type: "decimal", value: 1.25 },
  max: { type: "decimal", value: 1.5 },
}
```

Also works with Cookware and Timers

## Cookware quantities

- Cookware can also be quantified (without any unit, e.g. `#bowls{2}`)
- Quantities will be added similarly as ingredients if cookware is referenced, e.g. `#&bowls{2}`

## Arbitrary scalable quantities

Usage: <code v-pre>{{name:quantity%unit}}</code>

These quantities can be added to any step or note and will be scaled but not added to the ingredients list.

The `name` and `unit` are optional. 

Examples: 
- <code v-pre>{{5}}</code>
- <code v-pre>{{2%kcal}}</code>
- <code v-pre>{{factor}}</code>

## Alternative units

You can define equivalent quantities in different units for the same ingredient using the pipe `|` separator within the curly braces.

Usage: `@flour{100%g|3.5%oz}`

This is useful for providing multiple units (e.g. metric and imperial) simultaneously for the same ingredient. The first unit is considered the primary unit.

## Alternative ingredients

### Inline alternatives

You can specify alternative ingredients directly in the ingredient syntax using pipes: `@baseName{quantity}|altName{altQuantity}[note]|...`

This allows users to select from multiple alternatives when computing recipe quantities.

Use cases:
- `@milk{200%ml}|almond milk{100%ml}[vegan version]|soy milk{150%ml}[another vegan option]`
- `@sugar{100%g}|brown sugar{100%g}[for a richer flavor]`

When inline alternatives are defined, the recipe's [`choices`](/api/interfaces/RecipeChoices) property will be populated. You can then use the `calc_ingredient_quantities()` method to compute quantities corresponding to the user's choices.

All modifiers (`&`, `-`, `?`) work with inline alternatives:
`@&milk{200%ml}|-almond milk{100%ml}[vegan version]|?soy milk{150%ml}[another vegan option]`

### Grouped alternatives

Ingredients can also have alternatives by grouping them with the same group key using the syntax: `@|groupKey|ingredientName{}`

This is useful when you want to provide alternative choices in your recipe text naturally:

Use cases:
- `Add @|milk|milk{200%ml} or @|milk|almond milk{100%ml} or @|milk|oat milk{150%ml} for a vegan version`
- `Add some @|spices|salt{} or maybe some @|spices|pepper{}`

When grouped alternatives are defined, the recipe's [`choices`](/api/interfaces/RecipeChoices) property will be populated with available alternatives for each group. You can then use the `calc_ingredient_quantities()` method to compute quantities corresponding to the user's choices.

All modifiers (`&`, `-`, `?`) work with grouped alternatives:
```
Add @|flour|&flour tipo 00{100%g} or @|flour|flour tipo 1{50%g}
Add @|spices|-salt{} or @|spices|?pepper{}
```

## Ingredient aliases

- `@ingredientName|displayAlias{}` will add the ingredient as "ingredientName" in the ingredients list, but will display is as "displayAlias" in the preparation step.
- Also work with referencing etc. 

Example: .cook string `Mix @wheat flour{100%g} with additional @&wheat flour|flour{50%g}` will result in the following recipe object:

```json
{
  "metadata": {},
  "choices": {
    "ingredientItems": {
      "Map(0)": {}
    },
    "ingredientGroups": {
      "Map(0)": {}
    }
  },
  "ingredients": [
    {
      "name": "wheat flour",
      "usedAsPrimary": true,
      "quantities": [
        {
          "quantity": {
            "type": "fixed",
            "value": {
              "type": "decimal",
              "decimal": 150
            }
          },
          "unit": "g"
        }
      ]
    }
  ],
  "sections": [
    {
      "name": "",
      "content": [
        {
          "type": "step",
          "items": [
            {
              "type": "text",
              "value": "Mix "
            },
            {
              "type": "ingredient",
              "id": "ingredient-item-0",
              "alternatives": [
                {
                  "index": 0,
                  "displayName": "wheat flour",
                  "itemQuantity": {
                    "quantity": {
                      "type": "fixed",
                      "value": {
                        "type": "decimal",
                        "decimal": 100
                      }
                    },
                    "unit": {
                      "name": "g"
                    },
                    "scalable": true
                  }
                }
              ]
            },
            {
              "type": "text",
              "value": " with additional "
            },
            {
              "type": "ingredient",
              "id": "ingredient-item-1",
              "alternatives": [
                {
                  "index": 0,
                  "displayName": "flour",
                  "itemQuantity": {
                    "quantity": {
                      "type": "fixed",
                      "value": {
                        "type": "decimal",
                        "decimal": 50
                      }
                    },
                    "unit": {
                      "name": "g"
                    },
                    "scalable": true
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "cookware": [],
  "timers": [],
  "arbitraries": []
}
```

