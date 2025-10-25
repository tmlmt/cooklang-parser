---
outline: deep
---

# Guide: language extensions

This parser library introduces multiple extensions of the original [cooklang language](/guide-cooklang-specs). Most of them are directly inspired by / in line with the extensions proposed by the official ([cooklang-rs](https://github.com/cooklang/cooklang-rs/blob/main/extensions.md)) Rust parser.

List of extensions:

[[toc]]

## Modifiers

One of more prefixes can be added before the ingredient name (`@<modifiers>name{}`) to add metadata to a specific ingredient.

### `&`: reference to an existing ingredient

Use case: `Add @water{1%L} first, and than again @&water{100%mL}` will create one "water" ingredient with a quantity of 1.1L

- The quantities will be added to the ingredient having the same name existing in the `ingredients` list, according to the rules explained in the [units guide](/guide-units)
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

`"recipe"` will be added to the ingredient's [`flags`](/api/interfaces/Ingredient.html#flags) property.

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

## Ingredient aliases

- `@ingredientName|displayAlias{}` will add the ingredient as "ingredientName" in the ingredients list, but will display is as "displayAlias" in the preparation step.
- Also work with referencing etc. 

Example: .cook string `Mix @wheat flour{100%g} with additional @&wheat flour|flour{50%g}` will result in the following recipe object:

```json
{
  metadata: {},
  ingredients: [
    {
      name: "wheat flour",
      quantity: { type: "fixed", value: { type: "decimal", value: 150 } },
      quantityParts: [{ value: { type: "fixed", value: { type: "decimal", value: 100 } }, unit: "g", scalable: true},{ value: { type: "fixed", value: { type: "decimal", value: 50 } }, unit: "g", scalable: true}]
      unit: "g",
      flags: []
    },
  ],
  sections: [
    {
      name: "",
      content: [
        {
          type: "step",
          items: [
            { type: "text", value: "Mix " },
            {
              type: "ingredient",
              index: 0,
              quantityPartIndex: 0
              displayName: "wheat flour",
            },
            { type: "text", value: " with additional " },
            {
              type: "ingredient",
              index: 0,
              quantityPartIndex: 1,
              displayName: "flour",
            },
          ],
        },
      ],
    },
  ],
  cookware: [],
  timers: [],
};
```

