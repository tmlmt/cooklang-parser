import { describe, it, expect } from "vitest";
import {
  addQuantities,
  getDefaultQuantityValue,
  normalizeUnit,
  simplifyFraction,
  addNumericValues,
  getNumericValue,
  CannotAddTextValueError,
  IncompatibleUnitsError,
  addQuantityValues,
  multiplyNumericValue,
  multiplyQuantityValue,
  addQuantitiesOrGroups,
  getAverageValue,
  getUnitRatio,
  getEquivalentUnitsLists,
  getNormalizedUnit,
  reduceOrsToFirstEquivalent,
  addEquivalentsAndSimplify,
  toPlainUnit,
} from "../src/units";
import type {
  QuantityWithUnitDef,
  FlatOrGroup,
  QuantityWithExtendedUnit,
  QuantityWithPlainUnit,
} from "../src/units";
import type { DecimalValue, FixedValue, FractionValue } from "../src/types";
import Big from "big.js";

describe("normalizeUnit", () => {
  it("should normalize various unit strings to a canonical definition", () => {
    expect(normalizeUnit("g")?.name).toBe("g");
    expect(normalizeUnit("gram")?.name).toBe("g");
    expect(normalizeUnit("grams")?.name).toBe("g");
    expect(normalizeUnit("kilogram")?.name).toBe("kg");
    expect(normalizeUnit("L")?.name).toBe("l");
    expect(normalizeUnit("pounds")?.name).toBe("lb");
  });

  it("should return undefined for unknown units", () => {
    expect(normalizeUnit("glug")).toBeUndefined();
  });
});

describe("simplifyFraction", () => {
  it("should throw an error when the denominator is zero", () => {
    expect(() => simplifyFraction(1, 0)).toThrowError(
      "Denominator cannot be zero.",
    );
  });

  it("should simplify a fraction correctly", () => {
    const result = simplifyFraction(6, 8);
    expect(result).toEqual({ type: "fraction", num: 3, den: 4 });
  });

  it("should handle negative numbers correctly", () => {
    expect(simplifyFraction(-4, 6)).toEqual({
      type: "fraction",
      num: -2,
      den: 3,
    });
    expect(simplifyFraction(4, -6)).toEqual({
      type: "fraction",
      num: -2,
      den: 3,
    });
    expect(simplifyFraction(-4, -6)).toEqual({
      type: "fraction",
      num: 2,
      den: 3,
    });
  });

  it("should return a decimal value when the fraction simplifies to a whole number", () => {
    const result = simplifyFraction(10, 2);
    expect(result).toEqual({ type: "decimal", value: 5 });
  });

  it("should handle cases where the numerator is zero", () => {
    const result = simplifyFraction(0, 5);
    expect(result).toEqual({ type: "decimal", value: 0 });
  });

  it("should handle cases where the numerator is < 1", () => {
    const result = simplifyFraction(0.5, 2);
    expect(result).toEqual({ type: "fraction", num: 1, den: 4 });
  });
});

describe("addNumericValues", () => {
  it("should add two decimal values", () => {
    const val1: DecimalValue = { type: "decimal", value: 1.5 };
    const val2: DecimalValue = { type: "decimal", value: 2.5 };
    expect(addNumericValues(val1, val2)).toEqual({ type: "decimal", value: 4 });
  });

  it("should add two big decimal values", () => {
    const val1: DecimalValue = { type: "decimal", value: 1.1 };
    const val2: DecimalValue = { type: "decimal", value: 1.3 };
    expect(addNumericValues(val1, val2)).toEqual({
      type: "decimal",
      value: 2.4,
    });
  });

  it("should add two fraction values", () => {
    const val1: FractionValue = { type: "fraction", num: 1, den: 2 };
    const val2: FractionValue = { type: "fraction", num: 1, den: 4 };
    expect(addNumericValues(val1, val2)).toEqual({
      type: "fraction",
      num: 3,
      den: 4,
    });
  });

  it("should add a decimal and a fraction value", () => {
    const val1: DecimalValue = { type: "decimal", value: 0.5 };
    const val2: FractionValue = { type: "fraction", num: 1, den: 4 };
    expect(addNumericValues(val1, val2)).toEqual({
      type: "decimal",
      value: 0.75,
    });
  });

  it("should add a fraction and a decimal value", () => {
    const val1: FractionValue = { type: "fraction", num: 1, den: 2 };
    const val2: DecimalValue = { type: "decimal", value: 0.25 };
    expect(addNumericValues(val1, val2)).toEqual({
      type: "decimal",
      value: 0.75,
    });
  });

  it("should return a decimal when fractions add up to a whole number", () => {
    const val1: FractionValue = { type: "fraction", num: 1, den: 2 };
    const val2: FractionValue = { type: "fraction", num: 1, den: 2 };
    expect(addNumericValues(val1, val2)).toEqual({ type: "decimal", value: 1 });
  });

  it("should simplify the resulting fraction", () => {
    const val1: FractionValue = { type: "fraction", num: 1, den: 6 };
    const val2: FractionValue = { type: "fraction", num: 1, den: 6 };
    expect(addNumericValues(val1, val2)).toEqual({
      type: "fraction",
      num: 1,
      den: 3,
    });
  });

  it("should return 0 if both values are 0", () => {
    const val1: DecimalValue = { type: "decimal", value: 0 };
    const val2: DecimalValue = { type: "decimal", value: 0 };
    expect(addNumericValues(val1, val2)).toEqual({ type: "decimal", value: 0 });
  });
});

describe("addQuantityValues", () => {
  it("should add two fixed numerical values", () => {
    expect(
      addQuantityValues(
        { type: "fixed", value: { type: "decimal", value: 1 } },
        { type: "fixed", value: { type: "decimal", value: 2 } },
      ),
    ).toEqual({ type: "fixed", value: { type: "decimal", value: 3 } });
  });

  it("should add two range values", () => {
    expect(
      addQuantityValues(
        {
          type: "range",
          min: { type: "decimal", value: 1 },
          max: { type: "decimal", value: 2 },
        },
        {
          type: "range",
          min: { type: "decimal", value: 3 },
          max: { type: "decimal", value: 4 },
        },
      ),
    ).toEqual({
      type: "range",
      min: { type: "decimal", value: 4 },
      max: { type: "decimal", value: 6 },
    });
  });

  it("should add a fixed and a range value", () => {
    expect(
      addQuantityValues(
        { type: "fixed", value: { type: "decimal", value: 1 } },
        {
          type: "range",
          min: { type: "decimal", value: 3 },
          max: { type: "decimal", value: 4 },
        },
      ),
    ).toEqual({
      type: "range",
      min: { type: "decimal", value: 4 },
      max: { type: "decimal", value: 5 },
    });
  });

  it("should throw an error if one of the value is a text value", () => {
    expect(() =>
      addQuantityValues(
        { type: "fixed", value: { type: "text", value: "to taste" } },
        {
          type: "fixed",
          value: { type: "decimal", value: 1 },
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
          value: { type: "fixed", value: { type: "decimal", value: 100 } },
          unit: { name: "g" },
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 200 } },
          unit: { name: "g" },
        },
      ),
    ).toEqual({
      value: { type: "fixed", value: { type: "decimal", value: 300 } },
      unit: { name: "g" },
    });
  });

  it("should add big decimal numbers correctly", () => {
    expect(
      addQuantities(
        {
          value: { type: "fixed", value: { type: "decimal", value: 1.1 } },
          unit: { name: "kg" },
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 1.3 } },
          unit: { name: "kg" },
        },
      ),
    ).toEqual({
      value: { type: "fixed", value: { type: "decimal", value: 2.4 } },
      unit: { name: "kg" },
    });
  });

  it("should also work when at least one value is a range", () => {
    expect(
      addQuantities(
        {
          value: {
            type: "range",
            min: { type: "decimal", value: 100 },
            max: { type: "decimal", value: 200 },
          },
          unit: { name: "g" },
        },
        {
          value: {
            type: "range",
            min: { type: "decimal", value: 10 },
            max: { type: "decimal", value: 20 },
          },
          unit: { name: "g" },
        },
      ),
    ).toEqual({
      value: {
        type: "range",
        min: { type: "decimal", value: 110 },
        max: { type: "decimal", value: 220 },
      },
      unit: { name: "g" },
    });

    expect(
      addQuantities(
        {
          value: {
            type: "fixed",
            value: { type: "decimal", value: 100 },
          },
          unit: { name: "g" },
        },
        {
          value: {
            type: "range",
            min: { type: "decimal", value: 10 },
            max: { type: "decimal", value: 20 },
          },
          unit: { name: "g" },
        },
      ),
    ).toEqual({
      value: {
        type: "range",
        min: { type: "decimal", value: 110 },
        max: { type: "decimal", value: 120 },
      },
      unit: { name: "g" },
    });

    expect(
      addQuantities(
        {
          value: {
            type: "range",
            min: { type: "decimal", value: 10 },
            max: { type: "decimal", value: 20 },
          },
          unit: { name: "g" },
        },
        {
          value: {
            type: "fixed",
            value: { type: "decimal", value: 100 },
          },
          unit: { name: "g" },
        },
      ),
    ).toEqual({
      value: {
        type: "range",
        min: { type: "decimal", value: 110 },
        max: { type: "decimal", value: 120 },
      },
      unit: { name: "g" },
    });
  });

  it("should add compatible metric units and convert to largest", () => {
    expect(
      addQuantities(
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          unit: { name: "kg" },
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 500 } },
          unit: { name: "g" },
        },
      ),
    ).toEqual({
      value: { type: "fixed", value: { type: "decimal", value: 1.5 } },
      unit: { name: "kg" },
    });
    expect(
      addQuantities(
        {
          value: { type: "fixed", value: { type: "decimal", value: 500 } },
          unit: { name: "g" },
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          unit: { name: "kg" },
        },
      ),
    ).toEqual({
      value: { type: "fixed", value: { type: "decimal", value: 1.5 } },
      unit: { name: "kg" },
    });
  });

  it("should add compatible imperial units and convert to largest", () => {
    expect(
      addQuantities(
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          unit: { name: "lb" },
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 8 } },
          unit: { name: "oz" },
        },
      ),
    ).toEqual({
      value: { type: "fixed", value: { type: "decimal", value: 1.5 } },
      unit: { name: "lb" },
    });
  });

  it("should add compatible metric and imperial units, converting to largest metric", () => {
    const result = addQuantities(
      {
        value: { type: "fixed", value: { type: "decimal", value: 1 } },
        unit: { name: "lb" },
      },
      {
        value: { type: "fixed", value: { type: "decimal", value: 500 } },
        unit: { name: "g" },
      },
    );
    expect(result.unit).toEqual({ name: "kg" });
    expect(result.value).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 0.954 },
    });
  });

  it("should handle text quantities", () => {
    expect(() =>
      addQuantities(
        {
          value: { type: "fixed", value: { type: "text", value: "to taste" } },
          unit: { name: "" },
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 100 } },
          unit: { name: "g" },
        },
      ),
    ).toThrow(CannotAddTextValueError);
  });

  it("should handle adding to a quantity with no unit", () => {
    expect(
      addQuantities(
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          unit: { name: "" },
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 2 } },
          unit: { name: "g" },
        },
      ),
    ).toEqual({
      value: { type: "fixed", value: { type: "decimal", value: 3 } },
      unit: { name: "g" },
    });
    expect(
      addQuantities(
        {
          value: { type: "fixed", value: { type: "decimal", value: 100 } },
          unit: { name: "g" },
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          unit: { name: "" },
        },
      ),
    ).toEqual({
      value: { type: "fixed", value: { type: "decimal", value: 101 } },
      unit: { name: "g" },
    });
  });

  it("should simply add two quantities without unit or with empty string unit", () => {
    // Empty string unit
    expect(
      addQuantities(
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          unit: { name: "" },
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 2 } },
          unit: { name: "" },
        },
      ),
    ).toEqual({
      value: { type: "fixed", value: { type: "decimal", value: 3 } },
      unit: { name: "" },
    });
    // No unit
    expect(
      addQuantities(
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 2 } },
        },
      ),
    ).toEqual({
      value: { type: "fixed", value: { type: "decimal", value: 3 } },
    });
  });

  it("should throw error if trying to add incompatible units", () => {
    expect(() =>
      addQuantities(
        {
          value: { type: "fixed", value: { type: "decimal", value: 100 } },
          unit: { name: "g" },
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          unit: { name: "L" },
        },
      ),
    ).toThrow(IncompatibleUnitsError);
    expect(() =>
      addQuantities(
        {
          value: { type: "fixed", value: { type: "decimal", value: 100 } },
          unit: { name: "g" },
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          unit: { name: "bag" },
        },
      ),
    ).toThrow(IncompatibleUnitsError);
  });

  it("should add quantities defined as ranges", () => {
    expect(
      addQuantities(
        {
          value: {
            type: "range",
            min: { type: "decimal", value: 1 },
            max: { type: "decimal", value: 2 },
          },
          unit: { name: "tsp" },
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          unit: { name: "tsp" },
        },
      ),
    ).toEqual({
      value: {
        type: "range",
        min: { type: "decimal", value: 2 },
        max: { type: "decimal", value: 3 },
      },
      unit: { name: "tsp" },
    });
  });
});

describe("getDefaultQuantityValue + addQuantities", () => {
  it("should preseve fractions", () => {
    expect(
      addQuantities(
        { value: getDefaultQuantityValue() },
        {
          value: { type: "fixed", value: { type: "fraction", num: 1, den: 2 } },
          unit: { name: "" },
        },
      ),
    ).toEqual({
      value: { type: "fixed", value: { type: "fraction", num: 1, den: 2 } },
      unit: { name: "" },
    });
  });
  it("should preseve ranges", () => {
    expect(
      addQuantities(
        { value: getDefaultQuantityValue() },
        {
          value: {
            type: "range",
            min: { type: "decimal", value: 1 },
            max: { type: "decimal", value: 2 },
          },
          unit: { name: "" },
        },
      ),
    ).toEqual({
      value: {
        type: "range",
        min: { type: "decimal", value: 1 },
        max: { type: "decimal", value: 2 },
      },
      unit: { name: "" },
    });
  });
});

describe("multiplyNumericValue", () => {
  it("should multiply a decimal value", () => {
    const val: DecimalValue = { type: "decimal", value: 1.2 };
    expect(multiplyNumericValue(val, 3)).toEqual({
      type: "decimal",
      value: 3.6,
    });
  });
});

describe("multiplyQuantityValue", () => {
  it("should multiply a decimal value", () => {
    const val: FixedValue = {
      type: "fixed",
      value: { type: "decimal", value: 1.2 },
    };
    expect(multiplyQuantityValue(val, 3)).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 3.6 },
    });
  });

  describe("getNumericValue", () => {
    it("should get the numerical value of a DecimalValue", () => {
      expect(getNumericValue({ type: "decimal", value: 1.2 })).toBe(1.2);
    });

    it("should get the numerical value of a FractionValue", () => {
      expect(getNumericValue({ type: "fraction", num: 2, den: 3 })).toBe(2 / 3);
    });
  });
});

// Minimal mock for Quantity and FixedValue for testing
const q = (
  amount: number,
  unit?: string,
  integerProtected?: boolean,
): QuantityWithExtendedUnit => {
  const quantity: QuantityWithExtendedUnit = {
    value: { type: "fixed", value: { type: "decimal", value: amount } },
  };
  if (unit) {
    quantity.unit = { name: unit };
    if (integerProtected) {
      quantity.unit.integerProtected = integerProtected;
    }
  }
  return quantity;
};

// Minimal mock for Quantity and FixedValue for testing
const qPlain = (amount: number, unit?: string): QuantityWithPlainUnit => {
  const quantity: QuantityWithPlainUnit = {
    value: { type: "fixed", value: { type: "decimal", value: amount } },
  };
  if (unit) {
    quantity.unit = unit;
  }
  return quantity;
};

const qWithUnitDef = (
  amount: number,
  unit?: string,
  integerProtected?: boolean,
): QuantityWithUnitDef => {
  const quantity = q(amount, unit, integerProtected);
  quantity.unit = getNormalizedUnit(
    quantity.unit ? quantity.unit.name : "__no-unit__",
  );
  if (integerProtected) {
    quantity.unit.integerProtected = integerProtected;
  }
  return quantity as QuantityWithUnitDef;
};

describe("getAverageValue", () => {
  it("should return the correct value for fixed values", () => {
    expect(
      getAverageValue({ type: "fixed", value: { type: "decimal", value: 1 } }),
    ).toBe(1);
  });
  it("should return the correct value for ranges", () => {
    expect(
      getAverageValue({
        type: "range",
        min: { type: "decimal", value: 1 },
        max: { type: "decimal", value: 2 },
      }),
    ).toBe(1.5);
  });
  it("should return the correct value for text values", () => {
    expect(
      getAverageValue({ type: "fixed", value: { type: "text", value: "two" } }),
    ).toBe("two");
  });
});

describe("getUnitRatio", () => {
  it("should return the correct ratio for numerical values", () => {
    expect(
      getUnitRatio(qWithUnitDef(2, "large"), qWithUnitDef(1, "cup")),
    ).toEqual(Big(2));
    expect(
      getUnitRatio(qWithUnitDef(2, "large"), qWithUnitDef(1.5, "cup")),
    ).toEqual(Big(2).div(1.5));
  });
  it("should return the correct ratio for system units", () => {
    expect(getUnitRatio(qWithUnitDef(10, "mL"), qWithUnitDef(2, "cL"))).toEqual(
      Big(0.5),
    );
  });
  it("should throw and error if one of the values is a text", () => {
    expect(() =>
      getUnitRatio(
        {
          value: { type: "fixed", value: { type: "text", value: "two" } },
          unit: { name: "large", system: "none" },
        },
        qWithUnitDef(1, "cup"),
      ),
    ).toThrowError();
  });
});

describe("getEquivalentUnitsLists", () => {
  it("should consider units of the same system and type as similar", () => {
    expect(
      getEquivalentUnitsLists(
        { type: "or", quantities: [q(1, "small"), q(10, "mL"), q(1, "cup")] },
        { type: "or", quantities: [q(1, "large"), q(2, "cL"), q(1, "pint")] },
      ),
    ).toEqual([
      [
        qWithUnitDef(1, "small"),
        qWithUnitDef(10, "mL"),
        qWithUnitDef(1, "cup"),
        qWithUnitDef(0.5, "large"),
      ],
    ]);
  });
  it("should return the correct list for complex quantity groups", () => {
    expect(
      getEquivalentUnitsLists(
        {
          type: "or",
          quantities: [q(1, "bucket")],
        },
        {
          type: "or",
          quantities: [q(1, "mini"), q(1, "bag")],
        },
        q(1, "small"),
        q(1, "mini"),
        { type: "or", quantities: [q(1, "small"), q(1, "cup")] },
        {
          type: "or",
          quantities: [q(1, "large", true), q(0.75, "cup"), q(0.5, "pack")],
        },
      ),
    ).toEqual([
      [qWithUnitDef(1, "mini"), qWithUnitDef(1, "bag")],
      [
        qWithUnitDef(1, "small"),
        qWithUnitDef(1, "cup"),
        qWithUnitDef(1.333, "large", true),
        qWithUnitDef(0.667, "pack"),
      ],
    ]);
  });
});

describe("reduceOrsToFirstEquivalent", () => {
  const unitList = [
    [
      qWithUnitDef(2, "large", true),
      qWithUnitDef(1.5, "cup"),
      qWithUnitDef(3, "small", true),
    ],
  ];
  it("should keep protected Quantity's intact", () => {
    expect(
      reduceOrsToFirstEquivalent(unitList, [q(2, "large"), q(5, "small")]),
    ).toEqual([q(2, "large"), q(5, "small")]);
  });
  it("should correctly reduce or groups to first protected unit", () => {
    expect(
      reduceOrsToFirstEquivalent(unitList, [
        { type: "or", quantities: [q(2, "large"), q(1.5, "cup")] },
      ]),
    ).toEqual([q(2, "large")]);
  });
  it("should disregard order in the group", () => {
    expect(
      reduceOrsToFirstEquivalent(unitList, [
        { type: "or", quantities: [q(2, "large"), q(1.5, "cup")] },
        { type: "or", quantities: [q(1, "cup"), q(3, "large")] },
      ]),
    ).toEqual([q(2, "large"), q(3, "large")]);
  });
  it("should handle units of different systems and types", () => {
    expect(
      reduceOrsToFirstEquivalent(
        [[qWithUnitDef(10, "mL"), qWithUnitDef(1, "cup")]],
        [
          { type: "or", quantities: [q(10, "mL"), q(1, "cup")] },
          { type: "or", quantities: [q(2, "cL"), q(1, "pint")] },
        ],
      ),
    ).toEqual([q(10, "mL"), q(20, "mL")]);
  });
  it("should correctly transform Quantity into first compatible protected unit quantity", () => {
    expect(reduceOrsToFirstEquivalent(unitList, [q(1.5, "cup")])).toEqual([
      q(2, "large"),
    ]);
    expect(reduceOrsToFirstEquivalent(unitList, [q(1, "cup")])).toEqual([
      q(2, "small"),
    ]);
  });
});

describe("addQuantitiesOrGroups", () => {
  it("should reduce an OR group to its most relevant member", () => {
    const or: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(2, "large"), q(1.5, "cup")],
    };

    const { sum } = addQuantitiesOrGroups(or);
    expect(sum).toEqual(qWithUnitDef(2, "large"));
  });
  it("should add two OR groups to the sum of their most relevant member", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(2, "large"), q(1.5, "cup")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(4, "large"), q(3, "cup")],
    };

    const { sum } = addQuantitiesOrGroups(or1, or2);
    expect(sum).toEqual(qWithUnitDef(6, "large"));
  });
  it("should reduce two OR groups partially overlapping to the sum of the most relevant member of the union", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(2, "large"), q(1.5, "cup")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(2, "small"), q(1, "cup")],
    };

    const { sum } = addQuantitiesOrGroups(or1, or2);
    expect(sum).toEqual(qWithUnitDef(3.333, "large"));
  });
  it("should handle OR groups with different normalizable units", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(100, "ml"), q(1, "cup")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(20, "cl"), q(1, "pint")],
    }; // 10 cl = 100 ml

    const { sum } = addQuantitiesOrGroups(or1, or2);
    expect(sum).toEqual(qWithUnitDef(300, "ml"));
  });
});

describe("addEquivalentsAndSimplify", () => {
  it("leaves Quantity's intact", () => {
    expect(addEquivalentsAndSimplify(q(2, "kg"))).toEqual(qPlain(2, "kg"));
    expect(addEquivalentsAndSimplify(q(2, "kg"), q(2, "large"))).toEqual({
      type: "and",
      quantities: [qPlain(2, "kg"), qPlain(2, "large")],
    });
  });
  it("leaves single OR group intact", () => {
    const or: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(2, "kg"), q(2, "large")],
    };
    expect(addEquivalentsAndSimplify(or)).toEqual(toPlainUnit(or));
  });
  it("correctly adds two groups of equivalent quantities of same unit", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(1, "kg"), q(2, "large")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(1.5, "kg"), q(3, "large")],
    };
    expect(addEquivalentsAndSimplify(or1, or2)).toEqual({
      type: "or",
      quantities: [qPlain(5, "large"), qPlain(2.5, "kg")],
    });
  });
  it("correctly adds two groups of equivalent quantities of similar unit", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(1, "kg"), q(20, "large")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(100, "g"), q(2, "large")],
    };
    expect(addEquivalentsAndSimplify(or1, or2)).toEqual({
      type: "or",
      quantities: [qPlain(22, "large"), qPlain(1.1, "kg")],
    });
  });
  it("correctly adds two groups of equivalents with partial overlap", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(2, "large"), q(1.5, "cup")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(2, "small"), q(1, "cup")],
    };
    expect(addEquivalentsAndSimplify(or1, or2)).toEqual({
      type: "or",
      quantities: [
        qPlain(3.333, "large"),
        qPlain(5, "small"),
        qPlain(2.5, "cup"),
      ],
    });
  });
  it("accepts units of the same type but different system as alternative", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(10, "cup"), q(2366, "mL")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(1, "pint"), q(473, "mL")],
    };
    expect(addEquivalentsAndSimplify(or1, or2)).toEqual({
      type: "or",
      quantities: [qPlain(12, "cup"), qPlain(2839.2, "mL")],
    });
  });
  it("correctly take integer-protected units into account", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(2, "large", true), q(1.5, "cup")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(2, "small"), q(1, "cup")],
    };
    expect(addEquivalentsAndSimplify(or1, or2)).toEqual({
      type: "or",
      quantities: [
        { type: "and", quantities: [qPlain(2, "large"), qPlain(2, "small")] },
        qPlain(2.5, "cup"),
      ],
    });
  });
});
