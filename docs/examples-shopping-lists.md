---
outline: deep
---

# Examples: shopping lists

## Basics

A quick start example is provided in the corresponding [API page](/api/classes/ShoppingList#example). Note that it is `Recipe` objects that are passed to the `addRecipe()` method.

## Adding scaled recipes

You can specify a number of servings for which the recipe should be scaled before being added with [`addRecipe()`](/api/classes/ShoppingList.html#addRecipe). Example:

```typescript
shoppingList.addRecipe(myRecipe, 4)
```

When adding a recipe, the combined list of ingredients of the shopping list is automatically calculated, and the ingredients categorized if a `CategoryConfig` has been set.

## Removing recipes

You can remove the recipe by passing the index of the recipe to remove to the [`removeRecipe()`](/api/classes/ShoppingList.html#removeRecipe). The list of indexes is accessible via the [`recipes`](/api/classes/ShoppingList.html#recipes) property of the `ShoppingList`. Example:

```typescript
shoppingList.removeRecipe(0)
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
shoppingList.setCategoryConfig(myConfig)
```

### Categorizing according to the category configuration

This is done automatically each time you add or remove a recipe.

## Optional: Pantry

You can provide a [Pantry](/api/classes/Pantry) to the [ShoppingList](/api/classes/ShoppingList) so that on-hand pantry quantities are automatically subtracted from ingredient needs. The original pantry is never mutated — instead, a resulting pantry is recomputed on every recalculation.

### Adding a pantry

Use [`addPantry()`](/api/classes/ShoppingList.html#addPantry) with either a `Pantry` instance or a raw TOML string:

```typescript
import { Pantry, ShoppingList } from "@tmlmt/cooklang-parser";

const shoppingList = new ShoppingList();
shoppingList.addRecipe(myRecipe);

// From a TOML string
shoppingList.addPantry(`
[pantry]
flour = "500%g"
eggs = "6"
`);

// Or from a Pantry instance
const pantry = new Pantry(tomlString);
shoppingList.addPantry(pantry);
```

When a pantry is set, ingredient quantities in the shopping list are reduced by the corresponding pantry amounts. For example, if a recipe needs 200 g of flour and the pantry has 500 g, the shopping list will show 0 g of flour needed.

### Getting the resulting pantry

After recipes have been added, you can retrieve the resulting pantry — reflecting what remains after recipe needs have been subtracted — with [`getPantry()`](/api/classes/ShoppingList.html#getPantry):

```typescript
const resultingPantry = shoppingList.getPantry();
if (resultingPantry) {
  const flour = resultingPantry.findItem("flour");
  console.log(flour?.quantity); // remaining quantity after subtraction
}
```

If no pantry has been set, `getPantry()` returns `undefined`.