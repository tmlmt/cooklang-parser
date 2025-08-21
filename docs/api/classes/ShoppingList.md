[cooklang-parser](../globals.md) / ShoppingList

# Class: ShoppingList

Defined in: classes/shopping\_list.ts:15

Represents a shopping list.

## Constructors

### Constructor

> **new ShoppingList**(`aisle_config_str?`): `ShoppingList`

Defined in: classes/shopping\_list.ts:41

Creates a new ShoppingList instance.

#### Parameters

##### aisle\_config\_str?

`string`

The aisle configuration to parse.

#### Returns

`ShoppingList`

## Properties

### aisle\_config?

> `optional` **aisle\_config**: [`AisleConfig`](AisleConfig.md)

Defined in: classes/shopping\_list.ts:30

The aisle configuration for the shopping list.

#### See

[AisleConfig](AisleConfig.md)

***

### categories?

> `optional` **categories**: [`CategorizedIngredients`](../interfaces/CategorizedIngredients.md)

Defined in: classes/shopping\_list.ts:35

The categorized ingredients in the shopping list.

#### See

[CategorizedIngredients](../interfaces/CategorizedIngredients.md)

***

### ingredients

> **ingredients**: [`Ingredient`](../interfaces/Ingredient.md)[] = `[]`

Defined in: classes/shopping\_list.ts:20

The ingredients in the shopping list.

#### See

[Ingredient](../interfaces/Ingredient.md)

***

### recipes

> **recipes**: [`AddedRecipe`](../interfaces/AddedRecipe.md)[] = `[]`

Defined in: classes/shopping\_list.ts:25

The recipes in the shopping list.

#### See

[AddedRecipe](../interfaces/AddedRecipe.md)

## Methods

### add\_recipe()

> **add\_recipe**(`recipe`, `factor`): `void`

Defined in: classes/shopping\_list.ts:109

Adds a recipe to the shopping list.

#### Parameters

##### recipe

[`Recipe`](Recipe.md)

The recipe to add.

##### factor

`number` = `1`

The factor to scale the recipe by.

#### Returns

`void`

***

### categorize()

> **categorize**(): `void`

Defined in: classes/shopping\_list.ts:141

Categorizes the ingredients in the shopping list
Will use the aisle config if any, otherwise all ingredients will be placed in the "other" category

#### Returns

`void`

***

### remove\_recipe()

> **remove\_recipe**(`index`): `void`

Defined in: classes/shopping\_list.ts:119

Removes a recipe from the shopping list.

#### Parameters

##### index

`number`

The index of the recipe to remove.

#### Returns

`void`

***

### set\_aisle\_config()

> **set\_aisle\_config**(`config`): `void`

Defined in: classes/shopping\_list.ts:132

Sets the aisle configuration for the shopping list.

#### Parameters

##### config

`string`

The aisle configuration to parse.

#### Returns

`void`
