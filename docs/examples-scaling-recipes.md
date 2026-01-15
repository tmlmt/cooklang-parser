---
outline: deep
---

# Examples: scaling recipes

## Pre-requisite

To be able to scale, `Recipe` uses its [`servings`](/api/classes/Recipe.html#servings) property, which is done by the parser when it encounters
one of the following tags in the recipe's frontmatter: [`servings`](/api/interfaces/Metadata.html#servings), [`serves`](/api/interfaces/Metadata.html#serves) or [`yield`](/api/interfaces/Metadata.html#yield):

```json
---
servings: 2
[- or -]serves: 2
[- or -]yield: 2
---
```

If none of those are found and the `servings` property is undefined, it will default to 1 when scaling. The rest of this guide assumes that you have set one of the above, and will assume a `servings` value of `2`

## Scaling by a factor

Use the [`scaleBy()`](/api/classes/Recipe.html#scaleby) method.

```typescript
const recipe = Recipe(`...`)
const scaledRecipe = recipe.scaleBy(2)
```

In the above example, will be multiplied by 2:
- All the ingredients (including alternative units and alternative ingredients) with scalable numerical quantities
- The scaling metadata and `servings` value
- [Arbitrary scalable quantities](/guide-extensions.html#arbitrary-scalable-quantities)

## Scaling to a specific number of servings

Use the [`scaleTo()`](/api/classes/Recipe.html#scaleto) method.

```typescript
const recipe = Recipe(`...`)
const scaledRecipe = recipe.scaleTo(4)
// In this case, this is equivalent to 
// const scaledRecipe = recipe.scaleBy(2)
```

In the above example, will be adjusted by a factor of 4/2: 
- All the ingredients (including alternative units and alternative ingredients) with scalable numerical quantities have their quantities adjusted by a factor of 4/2 in this case
- The scaling metadata and `servings` value
- [Arbitrary scalable quantities](/guide-extensions.html#arbitrary-scalable-quantities)
