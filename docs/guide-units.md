---
outline: deep
---

# Guide: units and conversion

When adding quantities of [referenced ingredients](/guide-extensions.html#reference-to-an-existing-ingredient) together for the ingredients list (i.e the [ingredients](/api/classes/Recipe.html#ingredients) properties of a `Recipe`), the parser tries its best to add apples to apples.

## Conversion rules

The conversion behavior depends on the unit systems involved and whether a `unit system` is specified in the recipe metadata:

1. **Same system** → The largest unit of that system is used. Example: `1%kg` + `100%g` becomes `1.1%kg`

2. **Recipe has `unit system` metadata** → Convert to the specified system using the unit that supports it. Example with `unit system: UK`: `1%cup` + `1%fl-oz` becomes `1.1%cup` (using UK measurements)

3. **One unit is metric (no context)** → Convert to the metric unit. Example: `1%lb` + `500%g` becomes `953.592%g`

4. **Both units are ambiguous (no context)** → Default to US system, use larger unit. Example: `1%cup` + `1%fl-oz` becomes `1.125%cup` (US)

5. **Different non-metric systems (no context)** → Convert to metric. Example: `1%go` + `1%cup` becomes `0.417%l`

6. **Incompatible units** (e.g., text values, or volume and mass) → Quantities won't be added and will be kept separate.

## Specifying a unit system

You can specify a unit system in your recipe metadata to control how ambiguous units are resolved:

```cooklang
---
unit system: UK
---
Add @water{1%cup} and some more @&water{1%fl-oz}
```

Valid values (case insensitive) are: `metric`, `US`, `UK`, `JP` (see [Unit Reference Table](#unit-reference-table) below)

## Ambiguous units

Some units like `cup`, `tsp`, and `tbsp` have different sizes depending on the measurement system. These are marked as **ambiguous** and have system-specific conversion factors in the `toBaseBySystem` column.

When no `unit system` is specified:
- Units with a **metric** definition (like `tsp`, `tbsp`) default to metric
- Units without a metric definition (like `cup`, `pint`) default to US

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
