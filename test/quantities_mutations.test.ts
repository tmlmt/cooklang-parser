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
  FlatAndGroup,
  FlatOrGroup,
  MaybeNestedAndGroup,
  QuantityWithExtendedUnit,
  QuantityWithPlainUnit,
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
                toBaseBySystem: { metric: 15, US: 14.787, UK: 17.758 },
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
    expect(
      addQuantityValues(
        { type: "fixed", value: { type: "decimal", decimal: 1 } },
        {
          type: "range",
          min: { type: "decimal", decimal: 3 },
          max: { type: "decimal", decimal: 4 },
        },
      ),
    ).toEqual({
      type: "range",
      min: { type: "decimal", decimal: 4 },
      max: { type: "decimal", decimal: 5 },
    });
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

  it("should add compatible imperial units and convert to largest", () => {
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
      quantity: { type: "fixed", value: { type: "decimal", decimal: 1.5 } },
      unit: { name: "lb" },
    });
  });

  it("should add compatible metric and non-metric units, converting to largest metric if no context provided", () => {
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
    const resultUnit = { name: "g" };
    expect(result1.unit).toEqual(resultUnit);
    const resultQuantity = {
      type: "fixed",
      value: { type: "decimal", decimal: 953.592 },
    };
    expect(result1.quantity).toEqual(resultQuantity);
    // Also works the other way around
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
    expect(result2.unit).toEqual(resultUnit);
    expect(result2.quantity).toEqual(resultQuantity);
  });

  it("should convert sum of two non-metric units to metric if no context system provided", () => {
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
    const resultUnit = { name: "l" };
    expect(result1.unit).toEqual(resultUnit);
    // 180ml (go) + 236.588ml (cup defaulting to US)= 416.588ml = 0.416588l
    const resultQuantity = {
      type: "fixed",
      value: { type: "decimal", decimal: 0.417 },
    };
    expect(result1.quantity).toEqual(resultQuantity);
    // Also works the other way around
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

  it("should convert ambiguous units to supported context system if provided", () => {
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
    expect(result.unit).toEqual({ name: "cup" });
    // 1 cup + 0.125 cup
    expect(result.quantity).toEqual({
      type: "fixed",
      value: { type: "decimal", decimal: 1.125 },
    });
  });

  it("should convert the sum of ambiguous and metric units to supported context system if provided", () => {
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
    const resultUnit = { name: "cup" };
    expect(result1.unit).toEqual(resultUnit);
    // 1 cup + 0.423 cup
    const resultQuantity = {
      type: "fixed",
      value: { type: "decimal", decimal: 1.423 },
    };
    expect(result1.quantity).toEqual(resultQuantity);
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
    expect(result2.unit).toEqual(resultUnit);
    expect(result2.quantity).toEqual(resultQuantity);
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
