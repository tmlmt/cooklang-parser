---
outline: deep
---

# Examples: scaling recipes

## Pre-requisite

To be able to scale, a `Recipe` must have its [`servings`](/api/classes/Recipe.html#servings) property set, which is done by the parser when it encounters
one of the following tags in the recipe's frontmatter: [`servings`](/api/interfaces/Metadata.html#servings), [`serves`](/api/interfaces/Metadata.html#serves) or [`yield`](/api/interfaces/Metadata.html#yield):

```json
---
servings: 2
[- or -]serves: 2
[- or -]yield: 2
---
```

The rest of this guide assumes that you have set one of the above, and will assume a `servings` value of `2`

## Scaling by a factor

Use the [`scaleBy()`](/api/classes/Recipe.html#scaleby) method.

```typescript
const recipe = Recipe(`...`)
const scaledRecipe = recipe.scaleBy(2)
```

All the ingredients with numerical quantities have their quantities multiplied by 2, and the metadata and `servings` value will also be multiplied by 2

## Scaling to a specific number of servings

Use the [`scaleTo()`](/api/classes/Recipe.html#scaleto) method.

```typescript
const recipe = Recipe(`...`)
const scaledRecipe = recipe.scaleTo(4)
// In this case, this is equivalent to 
// const scaledRecipe = recipe.scaleBy(2)
```

All the ingredients with scalable numerical quantities have their quantities adjusted by a factor of 4/2 in this case, and the scaling metadata (if expressed as numbers) and `servings` property value will also be multiplied by the same factor.
