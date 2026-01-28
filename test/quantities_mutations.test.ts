import { describe, it, expect } from "vitest";

import {
  extendAllUnits,
  addQuantityValues,
  addQuantities,
  getDefaultQuantityValue,
  normalizeAllUnits,
  toExtendedUnit,
  flattenPlainUnitGroup,
} from "../src/quantities/mutations";
import { CannotAddTextValueError, IncompatibleUnitsError } from "../src/errors";
import {
  AndGroup,
  FixedValue,
  FlatAndGroup,
  FlatOrGroup,
  MaybeNestedAndGroup,
  QuantityWithExtendedUnit,
  QuantityWithPlainUnit,
  Range,
} from "../src/types";

describe("extendAllUnits", () => {
  it("should extend units in a simple quantity with plain units", () => {
    const original: QuantityWithPlainUnit = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
      unit: "g",
    };
    const extended = extendAllUnits(original);
    const expected: QuantityWithExtendedUnit = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
      unit: { name: "g" },
    };
    expect(extended).toEqual(expected);
  });
  it("should extend units in a nested group", () => {
    const original: MaybeNestedAndGroup<QuantityWithPlainUnit> = {
      and: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: "cup",
        },
        {
          or: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 2 },
              },
              unit: "tbsp",
            },
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 30 },
              },
              unit: "mL",
            },
          ],
        },
      ],
    };
    const extended = extendAllUnits(original);
    const expected: MaybeNestedAndGroup<QuantityWithExtendedUnit> = {
      and: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: { name: "cup" },
        },
        {
          or: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 2 },
              },
              unit: { name: "tbsp" },
            },
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 30 },
              },
              unit: { name: "mL" },
            },
          ],
        },
      ],
    };
    expect(extended).toEqual(expected);
  });
});

describe("normalizeAllUnits", () => {
  it("should normalize units in a simple quantity with plain units", () => {
    const original: QuantityWithPlainUnit = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 10 } },
      unit: "g",
    };
    const normalized = normalizeAllUnits(original);
    const expected = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 10 } },
      unit: {
        name: "g",
        type: "mass",
        system: "metric",
        aliases: ["gram", "grams", "grammes"],
        toBase: 1,
        maxValue: 999,
      },
    };
    expect(normalized).toEqual(expected);
  });
  it("should normalize units in a nested group", () => {
    const original: MaybeNestedAndGroup<QuantityWithPlainUnit> = {
      and: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: "cup",
        },
        {
          or: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 2 },
              },
              unit: "tbsp",
            },
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 30 },
              },
              unit: "mL",
            },
          ],
        },
      ],
    };
    const normalized = normalizeAllUnits(original);
    const expected = {
      and: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: {
            name: "cup",
            type: "volume",
            system: "ambiguous",
            aliases: ["cups"],
            toBase: 236.588,
            toBaseBySystem: { US: 236.588, UK: 284.131 },
            fractions: {
              enabled: true,
            },
            maxValue: 15,
          },
        },
        {
          or: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 2 },
              },
              unit: {
                name: "tbsp",
                type: "volume",
                system: "ambiguous",
                aliases: ["tablespoon", "tablespoons"],
                toBase: 15,
                toBaseBySystem: { metric: 15, US: 14.787, UK: 17.758, JP: 15 },
                fractions: {
                  denominators: [2, 3, 4],
                  enabled: true,
                },
                maxValue: 4,
              },
            },
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 30 },
              },
              unit: {
                name: "mL",
                type: "volume",
                system: "metric",
                aliases: [
                  "milliliter",
                  "milliliters",
                  "millilitre",
                  "millilitres",
                  "cc",
                ],
                toBase: 1,
                maxValue: 999,
              },
            },
          ],
        },
      ],
    };
    expect(normalized).toEqual(expected);
  });
});

describe("addQuantityValues", () => {
  it("should add two fixed numerical values", () => {
    expect(
      addQuantityValues(
        { type: "fixed", value: { type: "decimal", decimal: 1 } },
        { type: "fixed", value: { type: "decimal", decimal: 2 } },
      ),
    ).toEqual({ type: "fixed", value: { type: "decimal", decimal: 3 } });
  });

  it("should add two range values", () => {
    expect(
      addQuantityValues(
        {
          type: "range",
          min: { type: "decimal", decimal: 1 },
          max: { type: "decimal", decimal: 2 },
        },
        {
          type: "range",
          min: { type: "decimal", decimal: 3 },
          max: { type: "decimal", decimal: 4 },
        },
      ),
    ).toEqual({
      type: "range",
      min: { type: "decimal", decimal: 4 },
      max: { type: "decimal", decimal: 6 },
    });
  });

  it("should add a fixed and a range value", () => {
    const result: Range = {
      type: "range",
      min: { type: "decimal", decimal: 4 },
      max: { type: "decimal", decimal: 5 },
    };
    expect(
      addQuantityValues(
        { type: "fixed", value: { type: "decimal", decimal: 1 } },
        {
          type: "range",
          min: { type: "decimal", decimal: 3 },
          max: { type: "decimal", decimal: 4 },
        },
      ),
    ).toEqual(result);
    expect(
      addQuantityValues(
        {
          type: "range",
          min: { type: "decimal", decimal: 3 },
          max: { type: "decimal", decimal: 4 },
        },
        { type: "fixed", value: { type: "decimal", decimal: 1 } },
      ),
    ).toEqual(result);
  });

  it("should throw an error if one of the value is a text value", () => {
    expect(() =>
      addQuantityValues(
        { type: "fixed", value: { type: "text", text: "to taste" } },
        {
          type: "fixed",
          value: { type: "decimal", decimal: 1 },
        },
      ),
    ).toThrow(CannotAddTextValueError);
  });
});

describe("addQuantities", () => {
  it("should add same units correctly", () => {
    expect(
      addQuantities(
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
          unit: { name: "g" },
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 200 } },
          unit: { name: "g" },
        },
      ),
    ).toEqual({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 300 } },
      unit: { name: "g" },
    });
  });

  it("should add big decimal numbers correctly", () => {
    expect(
      addQuantities(
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1.1 } },
          unit: { name: "kg" },
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1.3 } },
          unit: { name: "kg" },
        },
      ),
    ).toEqual({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 2.4 } },
      unit: { name: "kg" },
    });
  });

  it("should also work when at least one value is a range", () => {
    expect(
      addQuantities(
        {
          quantity: {
            type: "range",
            min: { type: "decimal", decimal: 100 },
            max: { type: "decimal", decimal: 200 },
          },
          unit: { name: "g" },
        },
        {
          quantity: {
            type: "range",
            min: { type: "decimal", decimal: 10 },
            max: { type: "decimal", decimal: 20 },
          },
          unit: { name: "g" },
        },
      ),
    ).toEqual({
      quantity: {
        type: "range",
        min: { type: "decimal", decimal: 110 },
        max: { type: "decimal", decimal: 220 },
      },
      unit: { name: "g" },
    });

    expect(
      addQuantities(
        {
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 100 },
          },
          unit: { name: "g" },
        },
        {
          quantity: {
            type: "range",
            min: { type: "decimal", decimal: 10 },
            max: { type: "decimal", decimal: 20 },
          },
          unit: { name: "g" },
        },
      ),
    ).toEqual({
      quantity: {
        type: "range",
        min: { type: "decimal", decimal: 110 },
        max: { type: "decimal", decimal: 120 },
      },
      unit: { name: "g" },
    });

    expect(
      addQuantities(
        {
          quantity: {
            type: "range",
            min: { type: "decimal", decimal: 10 },
            max: { type: "decimal", decimal: 20 },
          },
          unit: { name: "g" },
        },
        {
          quantity: {
            type: "fixed",
            value: { type: "decimal", decimal: 100 },
          },
          unit: { name: "g" },
        },
      ),
    ).toEqual({
      quantity: {
        type: "range",
        min: { type: "decimal", decimal: 110 },
        max: { type: "decimal", decimal: 120 },
      },
      unit: { name: "g" },
    });
  });

  it("should add compatible metric units and convert to largest", () => {
    expect(
      addQuantities(
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: { name: "kg" },
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 500 } },
          unit: { name: "g" },
        },
      ),
    ).toEqual({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1.5 } },
      unit: { name: "kg" },
    });
    expect(
      addQuantities(
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 500 } },
          unit: { name: "g" },
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: { name: "kg" },
        },
      ),
    ).toEqual({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1.5 } },
      unit: { name: "kg" },
    });
  });

  it("should add compatible imperial units and prefer integer result", () => {
    // 1 lb + 8 oz = 24 oz = 1.5 lb
    // oz maxValue is 31, so 24oz is kept
    expect(
      addQuantities(
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: { name: "lb" },
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 8 } },
          unit: { name: "oz" },
        },
      ),
    ).toEqual({
      quantity: {
        type: "fixed",
        value: { type: "decimal", decimal: 24 },
      },
      unit: { name: "oz" },
    });
  });

  it("should add compatible metric and non-metric units, preferring metric", () => {
    // 1 lb = 453.592g, 500g + 453.592g = 953.592g
    // No system provided, one unit is metric → effectiveSystem = metric
    // lb is not compatible with metric system, so only metric units are candidates
    // g: 953.592 (in range, not integer)
    // kg: 0.954 (below range)
    // Best: g at 954 (rounded)
    const result1 = addQuantities(
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: { name: "lb" },
      },
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 500 } },
        unit: { name: "g" },
      },
    );
    expect(result1.unit).toEqual({ name: "g" });
    expect(result1.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", decimal: 954 },
    });
    // Also works the other way around (same result)
    const result2 = addQuantities(
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 500 } },
        unit: { name: "g" },
      },
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: { name: "lb" },
      },
    );
    expect(result2.unit).toEqual({ name: "g" });
    expect(result2.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", decimal: 954 },
    });
  });

  it("should add non-US-compatible units and return metric", () => {
    // 1 go = 180ml (JP system), 1 cup = 236.588ml (US default)
    // go is JP (not US-compatible), so effectiveSystem falls back to metric
    // Total = 180 + 236.588 = 416.588ml in base
    // With metric system:
    // ml: 417 (in range, dl/cl are deprioritized)
    const result1 = addQuantities(
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: { name: "go" },
      },
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: { name: "cup" },
      },
    );
    const resultUnit = { name: "ml" };
    expect(result1.unit).toEqual(resultUnit);
    const resultQuantity: FixedValue = {
      type: "fixed",
      value: { type: "decimal", decimal: 417 },
    };
    expect(result1.quantity).toEqual(resultQuantity);
    // Swap order: same result
    const result2 = addQuantities(
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: { name: "cup" },
      },
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: { name: "go" },
      },
    );
    expect(result2.unit).toEqual(resultUnit);
    expect(result2.quantity).toEqual(resultQuantity);
  });

  it("should add JP units and return JP", () => {
    const result1 = addQuantities(
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: { name: "go" },
      },
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: { name: "go" },
      },
    );
    const resultUnit = { name: "go" };
    expect(result1.unit).toEqual(resultUnit);
    const resultQuantity: FixedValue = {
      type: "fixed",
      value: { type: "decimal", decimal: 2 },
    };
    expect(result1.quantity).toEqual(resultQuantity);
    // Swap order: same result
    const result2 = addQuantities(
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: { name: "go" },
      },
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: { name: "go" },
      },
    );
    expect(result2.unit).toEqual(resultUnit);
    expect(result2.quantity).toEqual(resultQuantity);
  });

  it("should convert ambiguous units to supported context system if provided", () => {
    // 1 US cup = 236.588ml, 1 US fl-oz = 29.5735ml
    // Total = 266.1615ml in base
    // Input units: cup, fl-oz
    // cup: 266.1615/236.588 = 1.125 (in range, not integer)
    // fl-oz: 266.1615/29.5735 = 9 (integer! preferred)
    const result = addQuantities(
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: { name: "cup" },
      },
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: { name: "fl-oz" },
      },
      "US",
    );
    expect(result.unit).toEqual({ name: "fl-oz" });
    expect(result.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", decimal: 9 },
    });
  });

  it("should convert the sum of ambiguous and metric units to supported context system if provided", () => {
    // 1 US cup = 236.588ml, 100ml
    // Total = 336.588ml in base
    // Input units: cup (US), ml
    // cup: 336.588/236.588 = 1.42 (in range)
    // ml: 336.588 (in range)
    // Smallest in range from input: 1.42 cup → 11/8 as fraction (1.375, within 5%)
    const result1 = addQuantities(
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: { name: "cup" },
      },
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
        unit: { name: "ml" },
      },
      "US",
    );
    expect(result1.unit).toEqual({ name: "cup" });
    expect(result1.quantity).toEqual({
      type: "fixed",
      value: { type: "fraction", num: 11, den: 8 },
    });
    // Also works the other way around
    const result2 = addQuantities(
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
        unit: { name: "ml" },
      },
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: { name: "cup" },
      },

      "US",
    );
    expect(result2.unit).toEqual({ name: "cup" });
    expect(result2.quantity).toEqual({
      type: "fixed",
      value: { type: "fraction", num: 11, den: 8 },
    });
  });

  it("should choose the best unit when the result of outside the range of the input unit", () => {
    const result = addQuantities(
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 500 } },
        unit: { name: "g" },
      },
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 700 } },
        unit: { name: "g" },
      },
    );
    expect(result.unit).toEqual({ name: "kg" });
    expect(result.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", decimal: 1.2 },
    });
  });

  it("should handle text quantities", () => {
    expect(() =>
      addQuantities(
        {
          quantity: {
            type: "fixed",
            value: { type: "text", text: "to taste" },
          },
          unit: { name: "" },
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
          unit: { name: "g" },
        },
      ),
    ).toThrow(CannotAddTextValueError);
  });

  it("should handle adding to a quantity with no unit", () => {
    expect(
      addQuantities(
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: { name: "" },
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
          unit: { name: "g" },
        },
      ),
    ).toEqual({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 3 } },
      unit: { name: "g" },
    });
    expect(
      addQuantities(
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
          unit: { name: "g" },
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: { name: "" },
        },
      ),
    ).toEqual({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 101 } },
      unit: { name: "g" },
    });
  });

  it("should simply add two quantities without unit or with empty string unit", () => {
    // Empty string unit
    expect(
      addQuantities(
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: { name: "" },
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
          unit: { name: "" },
        },
      ),
    ).toEqual({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 3 } },
      unit: { name: "" },
    });
    // No unit
    expect(
      addQuantities(
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
        },
      ),
    ).toEqual({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 3 } },
    });
  });

  it("should throw error if trying to add incompatible units", () => {
    expect(() =>
      addQuantities(
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
          unit: { name: "g" },
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: { name: "L" },
        },
      ),
    ).toThrow(IncompatibleUnitsError);
    expect(() =>
      addQuantities(
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
          unit: { name: "g" },
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: { name: "bag" },
        },
      ),
    ).toThrow(IncompatibleUnitsError);
  });

  it("should add quantities defined as ranges", () => {
    expect(
      addQuantities(
        {
          quantity: {
            type: "range",
            min: { type: "decimal", decimal: 1 },
            max: { type: "decimal", decimal: 2 },
          },
          unit: { name: "tsp" },
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: { name: "tsp" },
        },
      ),
    ).toEqual({
      quantity: {
        type: "range",
        min: { type: "decimal", decimal: 2 },
        max: { type: "decimal", decimal: 3 },
      },
      unit: { name: "tsp" },
    });
  });

  it("should add ranges with different units", () => {
    // Range (100-200g) + fixed 1kg = range (1100-1200g) = range (1.1-1.2 kg)
    expect(
      addQuantities(
        {
          quantity: {
            type: "range",
            min: { type: "decimal", decimal: 100 },
            max: { type: "decimal", decimal: 200 },
          },
          unit: { name: "g" },
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: { name: "kg" },
        },
      ),
    ).toEqual({
      quantity: {
        type: "range",
        min: { type: "decimal", decimal: 1.1 },
        max: { type: "decimal", decimal: 1.2 },
      },
      unit: { name: "kg" },
    });
  });
});

describe("getDefaultQuantityValue + addQuantities", () => {
  it("should preseve fractions", () => {
    expect(
      addQuantities(
        { quantity: getDefaultQuantityValue() },
        {
          quantity: {
            type: "fixed",
            value: { type: "fraction", num: 1, den: 2 },
          },
          unit: { name: "" },
        },
      ),
    ).toEqual({
      quantity: { type: "fixed", value: { type: "fraction", num: 1, den: 2 } },
      unit: { name: "" },
    });
  });
  it("should preseve ranges", () => {
    expect(
      addQuantities(
        { quantity: getDefaultQuantityValue() },
        {
          quantity: {
            type: "range",
            min: { type: "decimal", decimal: 1 },
            max: { type: "decimal", decimal: 2 },
          },
          unit: { name: "" },
        },
      ),
    ).toEqual({
      quantity: {
        type: "range",
        min: { type: "decimal", decimal: 1 },
        max: { type: "decimal", decimal: 2 },
      },
      unit: { name: "" },
    });
  });
});

describe("toExtendedUnit", () => {
  it("should convert a simple QuantityWithPlainUnit", () => {
    const input: QuantityWithPlainUnit = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 5 } },
      unit: "g",
    };
    const result = toExtendedUnit(input);
    expect(result).toEqual({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 5 } },
      unit: { name: "g" },
    });
  });

  it("should convert an OR group of quantities", () => {
    const input: FlatOrGroup<QuantityWithPlainUnit> = {
      or: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: "cup",
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 250 } },
          unit: "mL",
        },
      ],
    };
    const result = toExtendedUnit(input);
    expect(result).toEqual({
      or: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: { name: "cup" },
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 250 } },
          unit: { name: "mL" },
        },
      ],
    });
  });

  it("should convert an AND group of quantities", () => {
    const input: AndGroup<QuantityWithPlainUnit> = {
      and: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
          unit: "egg",
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
          unit: "g",
        },
      ],
    };
    const result = toExtendedUnit(input);
    expect(result).toEqual({
      and: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
          unit: { name: "egg" },
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
          unit: { name: "g" },
        },
      ],
    });
  });

  it("should convert nested groups", () => {
    const input: AndGroup<QuantityWithPlainUnit> = {
      and: [
        {
          or: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: "cup",
            },
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 250 },
              },
              unit: "mL",
            },
          ],
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
          unit: "g",
        },
      ],
    };
    const result = toExtendedUnit(input);
    expect(result).toEqual({
      and: [
        {
          or: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: { name: "cup" },
            },
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 250 },
              },
              unit: { name: "mL" },
            },
          ],
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
          unit: { name: "g" },
        },
      ],
    });
  });

  it("should preserve equivalents array", () => {
    const input: QuantityWithPlainUnit = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
      unit: "cup",
      equivalents: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 250 } },
          unit: "mL",
        },
      ],
    };
    const result = toExtendedUnit(input);
    expect(result).toEqual({
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
      unit: { name: "cup" },
      equivalents: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 250 } },
          unit: "mL",
        },
      ],
    });
  });
});

describe("flattenPlainUnitGroup", () => {
  // flattenPlainUnitGroup is imported at the top
  it("should flatten a simple quantity", () => {
    const input: QuantityWithPlainUnit = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 5 } },
      unit: "g",
    };
    expect(flattenPlainUnitGroup(input)).toEqual([
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 5 } },
        unit: "g",
      },
    ]);
  });

  it("should return simple quantity without unit", () => {
    const input: QuantityWithPlainUnit = {
      quantity: { type: "fixed", value: { type: "decimal", decimal: 3 } },
    };
    expect(flattenPlainUnitGroup(input)).toEqual([
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 3 } },
      },
    ]);
  });

  it("should flatten an OR group to one with equivalents", () => {
    const input: FlatOrGroup<QuantityWithPlainUnit> = {
      or: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: "cup",
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 250 } },
          unit: "mL",
        },
      ],
    };
    expect(flattenPlainUnitGroup(input)).toEqual([
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: "cup",
        equivalents: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 250 },
            },
            unit: "mL",
          },
        ],
      },
    ]);
  });

  it("should flatten an AND group to separate entries", () => {
    const input: FlatAndGroup<QuantityWithPlainUnit> = {
      and: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
          unit: "egg",
        },
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
          unit: "g",
        },
      ],
    };
    expect(flattenPlainUnitGroup(input)).toEqual([
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
        unit: "egg",
      },
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 100 } },
        unit: "g",
      },
    ]);
  });

  it("should flatten an AND group with OR entries (entries with equivalents)", () => {
    // This tests lines 375-384: AND group where entries are OR groups
    // We need to use 'as unknown as' because the type system doesn't allow this directly
    // but the function handles it at runtime
    const input = {
      and: [
        {
          or: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 2 },
              },
              unit: "cups",
            },
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 500 },
              },
              unit: "mL",
            },
          ],
        },
        {
          or: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: "tbsp",
            },
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 15 },
              },
              unit: "bips",
            },
          ],
        },
      ],
    } as unknown as FlatAndGroup<QuantityWithPlainUnit>;
    expect(flattenPlainUnitGroup(input)).toEqual([
      {
        and: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 2 },
            },
            unit: "cups",
          },
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 1 },
            },
            unit: "tbsp",
          },
        ],
        equivalents: [
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 500 },
            },
            unit: "mL",
          },
          {
            quantity: {
              type: "fixed",
              value: { type: "decimal", decimal: 15 },
            },
            unit: "bips",
          },
        ],
      },
    ]);
  });

  it("should flatten an OR group containing an AND group without equivalents", () => {
    const input = {
      or: [
        {
          and: [
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 1 },
              },
              unit: "large",
            },
            {
              quantity: {
                type: "fixed",
                value: { type: "decimal", decimal: 2 },
              },
              unit: "small",
            },
          ],
        },
      ],
    } as unknown as FlatOrGroup<QuantityWithPlainUnit>;
    expect(flattenPlainUnitGroup(input)).toEqual([
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: "large",
      },
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 2 } },
        unit: "small",
      },
    ]);
  });

  it("should flatten a nested OR group with only one entry", () => {
    const input: FlatOrGroup<QuantityWithPlainUnit> = {
      or: [
        {
          quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
          unit: "cup",
        },
      ],
    };
    expect(flattenPlainUnitGroup(input)).toEqual([
      {
        quantity: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: "cup",
      },
    ]);
  });
});
