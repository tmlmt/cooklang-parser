---
outline: deep
---

# Reference: Units

## Units definitions

The following table shows all recognized units. Some units like `cup`, `tsp`, and `tbsp` have different sizes depending on the measurement system. These are marked as **ambiguous** and have system-specific conversion factors in the `toBaseBySystem` column.

### Mass

| Name | Type | System    | Aliases                                          | To Base (default) | To Base by System         |
| ---- | ---- | --------- | ------------------------------------------------ | ----------------- | ------------------------- |
| g    | mass | metric    | gram, grams, grammes                             | 1                 |                           |
| kg   | mass | metric    | kilogram, kilograms, kilogrammes, kilos, kilo    | 1000              |                           |
| oz   | mass | ambiguous | ounce, ounces                                    | 28.3495           | US: 28.3495, UK: 28.3495  |
| lb   | mass | ambiguous | pound, pounds                                    | 453.592           | US: 453.592, UK: 453.592  |

### Volume

#### Metric

| Name | Type   | System | Aliases                                              | To Base (default) | To Base by System |
| ---- | ------ | ------ | ---------------------------------------------------- | ----------------- | ----------------- |
| ml   | volume | metric | milliliter, milliliters, millilitre, millilitres, cc | 1                 |                   |
| cl   | volume | metric | centiliter, centiliters, centilitre, centilitres     | 10                |                   |
| dl   | volume | metric | deciliter, deciliters, decilitre, decilitres         | 100               |                   |
| l    | volume | metric | liter, liters, litre, litres                         | 1000              |                   |

#### JP

| Name | Type   | System | Aliases              | To Base (default) | To Base by System |
| ---- | ------ | ------ | -------------------- | ----------------- | ----------------- |
| go   | volume | JP     | gou, goo, 合, rice cup    | 180               |                   |

#### Ambiguous: metric/US/UK

| Name | Type   | System    | Aliases                | To Base (default) | To Base by System                   |
| ---- | ------ | --------- | ---------------------- | ----------------- | ----------------------------------- |
| tsp  | volume | ambiguous | teaspoon, teaspoons    | 5 (metric)        | metric: 5, US: 4.929, UK: 5.919     |
| tbsp | volume | ambiguous | tablespoon, tablespoons | 15 (metric)       | metric: 15, US: 14.787, UK: 17.758  |

#### Ambiguous: US/UK only

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

## Units configuration 

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
