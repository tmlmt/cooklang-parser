---
outline: deep
---

# Guide: unit conversion

For units definition, see [Units Reference](/reference-units).

## Automatic unit selection and conversion

When quantities are added together (e.g., from [referenced ingredients](/guide-extensions.html#reference-to-an-existing-ingredient)), the parser selects the most appropriate unit for the result. This does **not** apply to individual quantities—`@flour{500%g}` will always parse as `500 g`.

### Specifying a unit system

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

The per-unit configuration is detailed in the [Units Reference](/reference-units#units-configuration)

## Full-recipe unit conversion

It is also possible to convert an entire recipe into a specific unit system, using the [`convertTo()`](/api/classes/Recipe.html#convertto) method of the Recipe instance which returns a new Recipe with the specific conversion applied. 

```typescript
function convertTo(unit: SpecificUnitSystem, method: method: "keep" | "replace" | "remove"): Recipe
```

There are three modes for full-recipe unit conversion:
- `keep` will keep existing equivalents, and add the equivalent in the specified system
- `replace` will replace whichever equivalent was used for conversion, and keep the other equivalents
- `remove` will only leave the equivalent in the specified system and remove all others
