[cooklang-parser](../globals.md) / Recipe

# Class: Recipe

Defined in: classes/recipe.ts:31

Represents a recipe.

## Constructors

### Constructor

> **new Recipe**(`content?`): `Recipe`

Defined in: classes/recipe.ts:66

Creates a new Recipe instance.

#### Parameters

##### content?

`string`

The recipe content to parse.

#### Returns

`Recipe`

## Properties

### cookware

> **cookware**: [`Cookware`](../interfaces/Cookware.md)[] = `[]`

Defined in: classes/recipe.ts:51

The recipe's cookware.

#### See

[Cookware](../interfaces/Cookware.md)

***

### ingredients

> **ingredients**: [`Ingredient`](../interfaces/Ingredient.md)[] = `[]`

Defined in: classes/recipe.ts:41

The recipe's ingredients.

#### See

[Ingredient](../interfaces/Ingredient.md)

***

### metadata

> **metadata**: [`Metadata`](../interfaces/Metadata.md) = `{}`

Defined in: classes/recipe.ts:36

The recipe's metadata.

#### See

[Metadata](../interfaces/Metadata.md)

***

### sections

> **sections**: `Section`[] = `[]`

Defined in: classes/recipe.ts:46

The recipe's sections.

#### See

Section

***

### servings?

> `optional` **servings**: `number`

Defined in: classes/recipe.ts:60

The recipe's servings. Used for scaling

***

### timers

> **timers**: [`Timer`](../interfaces/Timer.md)[] = `[]`

Defined in: classes/recipe.ts:56

The recipe's timers.

#### See

[Timer](../interfaces/Timer.md)

## Methods

### clone()

> **clone**(): `Recipe`

Defined in: classes/recipe.ts:311

Clones the recipe.

#### Returns

`Recipe`

A new Recipe instance with the same properties.

***

### parse()

> **parse**(`content`): `void`

Defined in: classes/recipe.ts:76

Parses a recipe from a string.

#### Parameters

##### content

`string`

The recipe content to parse.

#### Returns

`void`

***

### scaleBy()

> **scaleBy**(`factor`): `Recipe`

Defined in: classes/recipe.ts:256

Scales the recipe by a factor.

#### Parameters

##### factor

`number`

The factor to scale the recipe by.

#### Returns

`Recipe`

A new Recipe instance with the scaled ingredients.

***

### scaleTo()

> **scaleTo**(`newServings`): `Recipe`

Defined in: classes/recipe.ts:240

Scales the recipe to a new number of servings.

#### Parameters

##### newServings

`number`

The new number of servings.

#### Returns

`Recipe`

A new Recipe instance with the scaled ingredients.
