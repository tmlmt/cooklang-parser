---
outline: deep
---

# Guide: units and conversion

When adding quantities of [referenced ingredients](/guide-extensions.html#reference-to-an-existing-ingredient) together for the ingredients list (i.e the [ingredients](/api/classes/Recipe.html#ingredients) properties of a `Recipe`), the parser tries its best to add apples to apples.


## Unit reference table

The following table shows all recognized units:

### Mass

| Name | Type | System    | Aliases                                          | To Base (default) | To Base by System         |
| ---- | ---- | --------- | ------------------------------------------------ | ----------------- | ------------------------- |
| g    | mass | metric    | gram, grams, grammes                             | 1                 |                           |
| kg   | mass | metric    | kilogram, kilograms, kilogrammes, kilos, kilo    | 1000              |                           |
| oz   | mass | ambiguous | ounce, ounces                                    | 28.3495           | US: 28.3495, UK: 28.3495  |
| lb   | mass | ambiguous | pound, pounds                                    | 453.592           | US: 453.592, UK: 453.592  |

### Volume (Metric)

| Name | Type   | System | Aliases                                              | To Base (default) | To Base by System |
| ---- | ------ | ------ | ---------------------------------------------------- | ----------------- | ----------------- |
| ml   | volume | metric | milliliter, milliliters, millilitre, millilitres, cc | 1                 |                   |
| cl   | volume | metric | centiliter, centiliters, centilitre, centilitres     | 10                |                   |
| dl   | volume | metric | deciliter, deciliters, decilitre, decilitres         | 100               |                   |
| l    | volume | metric | liter, liters, litre, litres                         | 1000              |                   |

### Volume (JP)

| Name | Type   | System | Aliases              | To Base (default) | To Base by System |
| ---- | ------ | ------ | -------------------- | ----------------- | ----------------- |
| go   | volume | JP     | gou, goo, 合, rice cup    | 180               |                   |

### Volume (Ambiguous: metric/US/UK)

| Name | Type   | System    | Aliases                | To Base (default) | To Base by System                   |
| ---- | ------ | --------- | ---------------------- | ----------------- | ----------------------------------- |
| tsp  | volume | ambiguous | teaspoon, teaspoons    | 5 (metric)        | metric: 5, US: 4.929, UK: 5.919     |
| tbsp | volume | ambiguous | tablespoon, tablespoons | 15 (metric)       | metric: 15, US: 14.787, UK: 17.758  |

### Volume (Ambiguous: US/UK only)

| Name   | Type   | System    | Aliases                   | To Base (default) | To Base by System        |
| ------ | ------ | --------- | ------------------------- | ----------------- | ------------------------ |
| fl-oz  | volume | ambiguous | fluid ounce, fluid ounces | 29.5735 (US)      | US: 29.5735, UK: 28.4131 |
| cup    | volume | ambiguous | cups                      | 236.588 (US)      | US: 236.588, UK: 284.131 |
| pint   | volume | ambiguous | pints                     | 473.176 (US)      | US: 473.176, UK: 568.261 |
| quart  | volume | ambiguous | quarts                    | 946.353 (US)      | US: 946.353, UK: 1136.52 |
| gallon | volume | ambiguous | gallons                   | 3785.41 (US)      | US: 3785.41, UK: 4546.09 |

### Count

| Name  | Type  | System | Aliases    | To Base (default) | To Base by System |
| ----- | ----- | ------ | ---------- | ----------------- | ----------------- |
| piece | count | metric | pieces, pc | 1                 |                   |

## Ambiguous units

Some units like `cup`, `tsp`, and `tbsp` have different sizes depending on the measurement system. These are marked as **ambiguous** and have system-specific conversion factors in the `toBaseBySystem` column.

## Specifying a unit system

You can specify a unit system in your recipe metadata to control how ambiguous units are resolved:

```cooklang
---
unit system: UK
---
Add @water{1%cup} and some more @&water{1%fl-oz}
```

Valid values (case insensitive) are: `metric`, `US`, `UK`, `JP` (see [Unit Reference Table](#unit-reference-table) above)

When no `unit system` is specified:
- Units with a **metric** definition (like `tsp`, `tbsp`) default to metric
- Units without a metric definition (like `cup`, `pint`) default to US

## Adding quantities

When quantities are added together (e.g., from [referenced ingredients](/guide-extensions.html#reference-to-an-existing-ingredient)), the parser selects the most appropriate unit for the result. This does **not** apply to individual quantities—`@flour{500%g}` will always parse as `500 g`.

### System selection

The target system depends on the input units and recipe metadata:

1. **Recipe has `unit system` metadata** → Use the specified system. Example with `unit system: UK`: `1%cup` + `1%fl-oz` becomes `11%fl-oz`

Otherwise:

2. **One unit is metric** → Convert to metric. Example: `1%lb` + `500%g` becomes `954%g`

3. **Both units are ambiguous and US-compatible** → Use US system. Example: `1%cup` + `1%fl-oz` becomes `9%fl-oz`

4. **Different non-metric systems** → Convert to metric. Example: `1%go` + `1%cup` becomes `417%ml`

5. **Incompatible units** (e.g., text values, or volume and mass) → Quantities won't be added and will be kept separate.

### Unit selection algorithm

Once the system is determined, the best unit is selected based on:

1. **Candidates units**: 
    - Units that belong to that system are considered potential candidates for best unit. The JP system also includes all the metric units. Certain units are disabled as not commonly used, by setting `isBestUnit` to false (default: true)
    - The units of the input quantities are restored into that list, as they are actually already used in the recipe.

2. **Valid range**: A value is considered "in range" for a unit if:
    - It's between 1 and the unit's `maxValue` (default: 999), OR
    - It's less than 1 but can be approximated as a fraction (for units with fractions enabled)

::: info Example: fraction-aware selection
With US units, a value of 1.7 ml (~0.345 tsp) will select `tsp` because:
- 0.345 ≈ 1/3, which is a valid fraction (denominator 3 is allowed)
- `tsp` has `fractions.enabled: true`
- Therefore 0.345 tsp is considered "in range" and is the smallest valid option
:::

3. **Selection priority** (among in-range candidates):
    - Smallest integer in the input unit family. Examples:
        - `1 cup + 1 cup` -> `2 cup` and not 1 pint
        - `0.5 pint + 0.5 pint` -> `1 pint` and not 2 cup
        - `2 cup + 1 pint` -> `2 pint` and not 4 cup
    - Smallest integers in any compatible family
    - Smallest non-integer value in range

4. **Fallback**: If no candidate is in range, the unit closest to the valid range is selected. This is in particular used for potential edge cases with values above 999 liters or 999 gallons. 

### Per-unit configuration

Each unit can have custom configuration:

| Config | Description | Default |
| ------ | ----------- | ------- |
| `isBestUnit` | Whether a unit is eligible for best unit | true |
| `maxValue` | Maximum value before upgrading to a larger unit | 999 |
| `fractions.enabled` | Whether to approximate decimals as fractions | false |
| `fractions.denominators` | Allowed denominators for fraction approximation | [2, 3, 4, 8] |
| `fractions.maxWhole` | Maximum whole number in mixed fraction | 4 |

Complete configuration for all units.

| Unit   | maxValue | fractions.enabled | fractions.denominators | isBestUnit |
| ------ | -------- | ----------------- | ---------------------- | ---------- |
| g      | 999      | —                 | —                      | ✓          |
| kg     | —        | —                 | —                      | ✓          |
| oz     | 31       | ✓                 | [2, 3, 4, 8]           | ✓          |
| lb     | —        | ✓                 | [2, 3, 4, 8]           | ✓          |
| ml     | 999      | —                 | —                      | ✓          |
| cl     | —        | —                 | —                      | —          |
| dl     | —        | —                 | —                      | —          |
| l      | —        | —                 | —                      | ✓          |
| go     | 10       | —                 | —                      | ✓          |
| tsp    | 5        | ✓                 | [2, 3, 4]              | ✓          |
| tbsp   | 4        | ✓                 | [2, 3, 4]              | ✓          |
| fl-oz  | 15       | ✓                 | [2, 3, 4, 8]           | ✓          |
| cup    | 4        | ✓                 | [2, 3, 4, 8]           | ✓          |
| pint   | 3        | ✓                 | [2, 3, 4, 8]           | —          |
| quart  | 3        | ✓                 | [2, 3, 4, 8]           | —          |
| gallon | —        | ✓                 | [2, 3, 4, 8]           | ✓          |
| piece  | 999      | —                 | —                      | ✓          |
