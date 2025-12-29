import { describe, it, expect } from "vitest";
import {
  simplifyFraction,
  addNumericValues,
  multiplyNumericValue,
  getNumericValue,
  multiplyQuantityValue,
} from "../src/utils/numeric";
import type { DecimalValue, FractionValue, FixedValue } from "../src/types";

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
    expect(result).toEqual({ type: "decimal", decimal: 5 });
  });

  it("should handle cases where the numerator is zero", () => {
    const result = simplifyFraction(0, 5);
    expect(result).toEqual({ type: "decimal", decimal: 0 });
  });

  it("should handle cases where the numerator is < 1", () => {
    const result = simplifyFraction(0.5, 2);
    expect(result).toEqual({ type: "fraction", num: 1, den: 4 });
  });
});

describe("addNumericValues", () => {
  it("should add two decimal values", () => {
    const val1: DecimalValue = { type: "decimal", decimal: 1.5 };
    const val2: DecimalValue = { type: "decimal", decimal: 2.5 };
    expect(addNumericValues(val1, val2)).toEqual({
      type: "decimal",
      decimal: 4,
    });
  });

  it("should add two big decimal values", () => {
    const val1: DecimalValue = { type: "decimal", decimal: 1.1 };
    const val2: DecimalValue = { type: "decimal", decimal: 1.3 };
    expect(addNumericValues(val1, val2)).toEqual({
      type: "decimal",
      decimal: 2.4,
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
    const val1: DecimalValue = { type: "decimal", decimal: 0.5 };
    const val2: FractionValue = { type: "fraction", num: 1, den: 4 };
    expect(addNumericValues(val1, val2)).toEqual({
      type: "decimal",
      decimal: 0.75,
    });
  });

  it("should add a fraction and a decimal value", () => {
    const val1: FractionValue = { type: "fraction", num: 1, den: 2 };
    const val2: DecimalValue = { type: "decimal", decimal: 0.25 };
    expect(addNumericValues(val1, val2)).toEqual({
      type: "decimal",
      decimal: 0.75,
    });
  });

  it("should return a decimal when fractions add up to a whole number", () => {
    const val1: FractionValue = { type: "fraction", num: 1, den: 2 };
    const val2: FractionValue = { type: "fraction", num: 1, den: 2 };
    expect(addNumericValues(val1, val2)).toEqual({
      type: "decimal",
      decimal: 1,
    });
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
    const val1: DecimalValue = { type: "decimal", decimal: 0 };
    const val2: DecimalValue = { type: "decimal", decimal: 0 };
    expect(addNumericValues(val1, val2)).toEqual({
      type: "decimal",
      decimal: 0,
    });
  });
});

describe("multiplyNumericValue", () => {
  it("should multiply a decimal value", () => {
    const val: DecimalValue = { type: "decimal", decimal: 1.2 };
    expect(multiplyNumericValue(val, 3)).toEqual({
      type: "decimal",
      decimal: 3.6,
    });
  });
});

describe("getNumericValue", () => {
  it("should get the numerical value of a DecimalValue", () => {
    expect(getNumericValue({ type: "decimal", decimal: 1.2 })).toBe(1.2);
  });

  it("should get the numerical value of a FractionValue", () => {
    expect(getNumericValue({ type: "fraction", num: 2, den: 3 })).toBe(2 / 3);
  });
});

describe("multiplyQuantityValue", () => {
  it("should multiply a decimal value", () => {
    const val: FixedValue = {
      type: "fixed",
      value: { type: "decimal", decimal: 1.2 },
    };
    expect(multiplyQuantityValue(val, 3)).toEqual({
      type: "fixed",
      value: { type: "decimal", decimal: 3.6 },
    });
  });
});
