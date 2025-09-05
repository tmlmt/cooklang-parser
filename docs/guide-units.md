---
outline: deep
---

# Guide: units and conversion

When adding quantities of [referenced ingredients](/api/guide-extensions#modifiers) together for the ingredients list (i.e the [ingredients](/api/classes/Recipe.html#ingredients) properties of a `Recipe`), the parser tries its best to add apples to apples. 

- If the quantities are defined in two different units of the same type and system, the largest unit is retained and the other quantity is converted. Example: `1%kg` + `100%g` will become `1.1%kg`
- If the quantities are defined in units of the same type but in different systems (e.g. volume and mass), they will be first converted to the metric unit
- If the quantities are defined in incompatible units (e.g. text, or volume and mass), the quantities won't be added and a separate ingredient will be created in the list.

The following table of units and aliases is taken into account:

| Name   | Type   | System   | Aliases                                              | To Base |
| ------ | ------ | -------- | ---------------------------------------------------- | ------- |
| g      | mass   | metric   | gram, grams, grammes                                 | 1       |
| kg     | mass   | metric   | kilogram, kilograms, kilo, kilos                     | 1000    |
| oz     | mass   | imperial | ounce, ounces                                        | 28.3495 |
| lb     | mass   | imperial | pound, pounds                                        | 453.592 |
| ml     | volume | metric   | milliliter, milliliters, millilitre, millilitres, cc | 1       |
| l      | volume | metric   | liter, liters, litre, litres                         | 1000    |
| tsp    | volume | metric   | teaspoon, teaspoons                                  | 5       |
| tbsp   | volume | metric   | tablespoon, tablespoons,                             | 15      |
| fl-oz  | volume | imperial | fluid ounce, fluid ounces                            | 29.5735 |
| cup    | volume | imperial | cups                                                 | 236.588 |
| pint   | volume | imperial | pints                                                | 473.176 |
| quart  | volume | imperial | quarts                                               | 946.353 |
| gallon | volume | imperial | gallons                                              | 3785.41 |
| piece  | count  | metric   | pieces, pc                                           | 1       |
