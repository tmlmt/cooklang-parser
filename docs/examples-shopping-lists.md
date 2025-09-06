---
outline: deep
---

# Examples: shopping lists

## Basics

A quick start example is provided in the corresponding [API page](/api/classes/ShoppingList#example). Note that it is `Recipe` objects that are passed to the `add_recipe()` method.

## Adding scaled recipes

You can specify a number of servings for which the recipe should be scaled before being added with [`add_recipe()`](/api/classes/ShoppingList.html#add-recipe). Example:

```typescript
shoppingList.add_recipe(myRecipe, 4)
```

When adding a recipe, the combined list of ingredients of the shopping list is automatically calculated, and the ingredients categorized if a `CategoryConfig` has been set.

## Removing recipes

You can remove the recipe by passing the index of the recipe to remove to the [`remove_recipe()`](/api/classes/ShoppingList.html#remove-recipe). The list of indexes is accessible via the [`recipes`](/api/classes/ShoppingList.html#recipes) property of the `ShoppingList`. Example:

```typescript
shoppingList.remove_recipe(0)
```

## Optional: Category Configuration

You can provide a [CategoryConfig](/api/classes/CategoryConfig) to the [ShoppingList](/api/classes/ShoppingList) in order to categorize ingredients in your shopping list. Categories can be aisles in a supermarket, or different supermarkets or anyhow else you would like to categorize your ingredients. 

### Creating a category configuration

See [CategoryConfig](/api/classes/CategoryConfig)

### Prodiving a category configuration to the shopping list

Either when initializing the `ShoppingList` or afterwards: 

```typescript
const myConfig = new CategoryConfig(`...`)
const shoppingList = new ShoppingList(myConfig)
// or 
const shoppingList = new ShoppingList()
shoppingList.set_category_config(myConfig)
```

### Categorizing according to the category configuration

This is done automatically each time you add or remove a recipe.