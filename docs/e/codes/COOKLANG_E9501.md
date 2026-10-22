---
code: COOKLANG_E9501
level: error(fatal)
title: Unresolved alternatives
---

## What this error means

A recipe with ingredient alternatives was added to a shopping list without a choice for each alternative.

## Common causes

- `choices` is missing or incomplete in the options of `ShoppingList.addRecipe()`

## How to fix it

```typescript
// Make sure each available choice is made
list.addRecipe(recipe, {
  choices: {
    ingredientItems: new Map( ... ), // need to be of size recipe.choices.ingredientItems.len
    ingredientGroups: new Map( ... ), // need to be of size recipe.choices.ingredientGroups.len,
  },
});
```

The error message lists the alternatives that need a choice.
