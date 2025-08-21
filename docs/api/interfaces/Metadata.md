[cooklang-parser](../globals.md) / Metadata

# Interface: Metadata

Defined in: types.ts:7

Represents the metadata of a recipe.

## Properties

### author?

> `optional` **author**: `string`

Defined in: types.ts:15

The author of the recipe.

***

### category?

> `optional` **category**: `string`

Defined in: types.ts:33

The category of the recipe.

***

### cook time?

> `optional` **cook time**: `string`

Defined in: types.ts:47

The cooking time of the recipe.
 Will not be further parsed into any DateTime format nor normalize

***

### course?

> `optional` **course**: `string`

Defined in: types.ts:31

The course of the recipe.

***

### cuisine?

> `optional` **cuisine**: `string`

Defined in: types.ts:68

The cuisine of the recipe.

***

### description?

> `optional` **description**: `string`

Defined in: types.ts:72

The description of the recipe.

***

### diet?

> `optional` **diet**: `string`

Defined in: types.ts:70

The diet of the recipe.

***

### difficulty?

> `optional` **difficulty**: `string`

Defined in: types.ts:66

The difficulty of the recipe.

***

### duration?

> `optional` **duration**: `string`

Defined in: types.ts:64

***

### images?

> `optional` **images**: `string`[]

Defined in: types.ts:74

The images of the recipe.

***

### prep time?

> `optional` **prep time**: `string`

Defined in: types.ts:38

The preparation time of the recipe.
 Will not be further parsed into any DateTime format nor normalize

***

### serves?

> `optional` **serves**: `string`

Defined in: types.ts:29

The number of people the recipe serves.
 Complex info can be given, as long as the first part before a comma has a numerical value, which will be used for scaling
 Interchangeable with `servings` or `yield`. If multiple ones are defined, the latest one will be used for scaling

***

### servings?

> `optional` **servings**: `string`

Defined in: types.ts:19

The number of servings the recipe makes.
Complex info can be given, as long as the first part before a comma has a numerical value, which will be used for scaling
Interchangeable with `yield` or `serves`. If multiple ones are defined, the latest one will be used for scaling

***

### source?

> `optional` **source**: `string`

Defined in: types.ts:13

The source of the recipe.

***

### tags?

> `optional` **tags**: `string`[]

Defined in: types.ts:11

The tags of the recipe.

***

### time?

> `optional` **time**: `string`

Defined in: types.ts:60

***

### time required?

> `optional` **time required**: `string`

Defined in: types.ts:56

The total time of the recipe.
 Will not be further parsed into any DateTime format nor normalize

***

### time.cook?

> `optional` **time.cook**: `string`

Defined in: types.ts:51

Alias of `cook time`

***

### time.prep?

> `optional` **time.prep**: `string`

Defined in: types.ts:42

Alias of `prep time`

***

### title?

> `optional` **title**: `string`

Defined in: types.ts:9

The title of the recipe.

***

### yield?

> `optional` **yield**: `string`

Defined in: types.ts:24

The yield of the recipe.
 Complex info can be given, as long as the first part before a comma has a numerical value, which will be used for scaling
 Interchangeable with `servings` or `serves`. If multiple ones are defined, the latest one will be used for scaling
