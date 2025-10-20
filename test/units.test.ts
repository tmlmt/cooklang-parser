import { describe, it, expect } from "vitest";
import {
  addQuantities,
  getDefaultQuantityValue,
  normalizeUnit,
  simplifyFraction,
  addNumericValues,
  CannotAddTextValueError,
  IncompatibleUnitsError,
} from "../src/units";
import type { DecimalValue, FractionValue } from "../src/types";

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
});

describe("addQuantities", () => {
  it("should add same units correctly", () => {
    expect(
      addQuantities(
        {
          value: { type: "fixed", value: { type: "decimal", value: 100 } },
          unit: "g",
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 200 } },
          unit: "g",
        },
      ),
    ).toEqual({
      value: { type: "fixed", value: { type: "decimal", value: 300 } },
      unit: "g",
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
          unit: "g",
        },
        {
          value: {
            type: "range",
            min: { type: "decimal", value: 10 },
            max: { type: "decimal", value: 20 },
          },
          unit: "g",
        },
      ),
    ).toEqual({
      value: {
        type: "range",
        min: { type: "decimal", value: 110 },
        max: { type: "decimal", value: 220 },
      },
      unit: "g",
    });

    expect(
      addQuantities(
        {
          value: {
            type: "fixed",
            value: { type: "decimal", value: 100 },
          },
          unit: "g",
        },
        {
          value: {
            type: "range",
            min: { type: "decimal", value: 10 },
            max: { type: "decimal", value: 20 },
          },
          unit: "g",
        },
      ),
    ).toEqual({
      value: {
        type: "range",
        min: { type: "decimal", value: 110 },
        max: { type: "decimal", value: 120 },
      },
      unit: "g",
    });

    expect(
      addQuantities(
        {
          value: {
            type: "range",
            min: { type: "decimal", value: 10 },
            max: { type: "decimal", value: 20 },
          },
          unit: "g",
        },
        {
          value: {
            type: "fixed",
            value: { type: "decimal", value: 100 },
          },
          unit: "g",
        },
      ),
    ).toEqual({
      value: {
        type: "range",
        min: { type: "decimal", value: 110 },
        max: { type: "decimal", value: 120 },
      },
      unit: "g",
    });
  });

  it("should add compatible metric units and convert to largest", () => {
    expect(
      addQuantities(
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          unit: "kg",
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 500 } },
          unit: "g",
        },
      ),
    ).toEqual({
      value: { type: "fixed", value: { type: "decimal", value: 1.5 } },
      unit: "kg",
    });
    expect(
      addQuantities(
        {
          value: { type: "fixed", value: { type: "decimal", value: 500 } },
          unit: "g",
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          unit: "kg",
        },
      ),
    ).toEqual({
      value: { type: "fixed", value: { type: "decimal", value: 1.5 } },
      unit: "kg",
    });
  });

  it("should add compatible imperial units and convert to largest", () => {
    expect(
      addQuantities(
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          unit: "lb",
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 8 } },
          unit: "oz",
        },
      ),
    ).toEqual({
      value: { type: "fixed", value: { type: "decimal", value: 1.5 } },
      unit: "lb",
    });
  });

  it("should add compatible metric and imperial units, converting to largest metric", () => {
    const result = addQuantities(
      {
        value: { type: "fixed", value: { type: "decimal", value: 1 } },
        unit: "lb",
      },
      {
        value: { type: "fixed", value: { type: "decimal", value: 500 } },
        unit: "g",
      },
    );
    expect(result.unit).toBe("kg");
    expect(result.value).toEqual({
      type: "fixed",
      value: { type: "decimal", value: 0.95 },
    });
  });

  it("should handle text quantities", () => {
    expect(() =>
      addQuantities(
        {
          value: { type: "fixed", value: { type: "text", value: "to taste" } },
          unit: "",
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 100 } },
          unit: "g",
        },
      ),
    ).toThrow(CannotAddTextValueError);
  });

  it("should handle adding to a quantity with no unit", () => {
    expect(
      addQuantities(
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          unit: "",
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 2 } },
          unit: "g",
        },
      ),
    ).toEqual({
      value: { type: "fixed", value: { type: "decimal", value: 3 } },
      unit: "g",
    });
    expect(
      addQuantities(
        {
          value: { type: "fixed", value: { type: "decimal", value: 100 } },
          unit: "g",
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          unit: "",
        },
      ),
    ).toEqual({
      value: { type: "fixed", value: { type: "decimal", value: 101 } },
      unit: "g",
    });
  });

  it("should throw error if trying to add incompatible units", () => {
    expect(() =>
      addQuantities(
        {
          value: { type: "fixed", value: { type: "decimal", value: 100 } },
          unit: "g",
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          unit: "L",
        },
      ),
    ).toThrow(IncompatibleUnitsError);
    expect(() =>
      addQuantities(
        {
          value: { type: "fixed", value: { type: "decimal", value: 100 } },
          unit: "g",
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          unit: "bag",
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
          unit: "tsp",
        },
        {
          value: { type: "fixed", value: { type: "decimal", value: 1 } },
          unit: "tsp",
        },
      ),
    ).toEqual({
      value: {
        type: "range",
        min: { type: "decimal", value: 2 },
        max: { type: "decimal", value: 3 },
      },
      unit: "tsp",
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
          unit: "",
        },
      ),
    ).toEqual({
      value: { type: "fixed", value: { type: "fraction", num: 1, den: 2 } },
      unit: "",
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
          unit: "",
        },
      ),
    ).toEqual({
      value: {
        type: "range",
        min: { type: "decimal", value: 1 },
        max: { type: "decimal", value: 2 },
      },
      unit: "",
    });
  });
});
