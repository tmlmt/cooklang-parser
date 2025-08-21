[cooklang-parser](../globals.md) / AisleConfig

# Class: AisleConfig

Defined in: classes/aisle\_config.ts:7

Represents the aisle configuration for a shopping list.

## Constructors

### Constructor

> **new AisleConfig**(`config?`): `AisleConfig`

Defined in: classes/aisle\_config.ts:18

Creates a new AisleConfig instance.

#### Parameters

##### config?

`string`

The aisle configuration to parse.

#### Returns

`AisleConfig`

## Properties

### categories

> **categories**: [`AisleCategory`](../interfaces/AisleCategory.md)[] = `[]`

Defined in: classes/aisle\_config.ts:12

The categories of aisles.

#### See

[AisleCategory](../interfaces/AisleCategory.md)

## Methods

### parse()

> **parse**(`config`): `void`

Defined in: classes/aisle\_config.ts:28

Parses an aisle configuration from a string.

#### Parameters

##### config

`string`

The aisle configuration to parse.

#### Returns

`void`
