import { describe, it, expect } from "vitest";

import {
  approximateFraction,
  formatOutputValue,
  toRoundedDecimal,
} from "../src/quantities/numeric";

describe("toRoundedDecimal", () => {
  it("should round decimal values to 3 significant digits by default", () => {
    // 1.23456 rounded to 3 sig figs = 1.23
    expect(toRoundedDecimal({ type: "decimal", decimal: 1.23456 })).toEqual({
      type: "decimal",
      decimal: 1.23,
    });
    // 12.3456 rounded to 3 sig figs = 12.3
    expect(toRoundedDecimal({ type: "decimal", decimal: 12.3456 })).toEqual({
      type: "decimal",
      decimal: 12.3,
    });
    // 123.456 rounded to 3 sig figs = 123
    expect(toRoundedDecimal({ type: "decimal", decimal: 123.456 })).toEqual({
      type: "decimal",
      decimal: 123,
    });
    // 0.0123456 rounded to 3 sig figs = 0.0123
    expect(toRoundedDecimal({ type: "decimal", decimal: 0.0123456 })).toEqual({
      type: "decimal",
      decimal: 0.0123,
    });
  });
  it("should round decimal values to specified significant digits", () => {
    // 1.23456 rounded to 2 sig figs = 1.2
    expect(toRoundedDecimal({ type: "decimal", decimal: 1.23456 }, 2)).toEqual({
      type: "decimal",
      decimal: 1.2,
    });
    // 1.23456 rounded to 4 sig figs = 1.235
    expect(toRoundedDecimal({ type: "decimal", decimal: 1.23456 }, 4)).toEqual({
      type: "decimal",
      decimal: 1.235,
    });
  });
  it("should preserve integers with 4+ digits fully", () => {
    // 1234.5 should become 1235 (preserving integer portion)
    expect(toRoundedDecimal({ type: "decimal", decimal: 1234.5 })).toEqual({
      type: "decimal",
      decimal: 1235,
    });
    // 12345.6 should become 12346
    expect(toRoundedDecimal({ type: "decimal", decimal: 12345.6 })).toEqual({
      type: "decimal",
      decimal: 12346,
    });
    // Already an integer - keep it
    expect(toRoundedDecimal({ type: "decimal", decimal: 1107 })).toEqual({
      type: "decimal",
      decimal: 1107,
    });
  });
  it("should round fraction values to 3 significant digits by default", () => {
    // 1/3 = 0.333... rounded to 3 sig figs = 0.333
    expect(toRoundedDecimal({ type: "fraction", num: 1, den: 3 })).toEqual({
      type: "decimal",
      decimal: 0.333,
    });
  });
  it("should handle zero", () => {
    expect(toRoundedDecimal({ type: "decimal", decimal: 0 })).toEqual({
      type: "decimal",
      decimal: 0,
    });
  });
});

describe("approximateFraction", () => {
  it("should approximate 0.5 as 1/2", () => {
    expect(approximateFraction(0.5)).toEqual({
      type: "fraction",
      num: 1,
      den: 2,
    });
  });

  it("should approximate 1.5 as 3/2", () => {
    expect(approximateFraction(1.5)).toEqual({
      type: "fraction",
      num: 3,
      den: 2,
    });
  });

  it("should approximate 0.25 as 1/4", () => {
    expect(approximateFraction(0.25)).toEqual({
      type: "fraction",
      num: 1,
      den: 4,
    });
  });

  it("should approximate 0.333... as 1/3", () => {
    expect(approximateFraction(1 / 3)).toEqual({
      type: "fraction",
      num: 1,
      den: 3,
    });
  });

  it("should return null for negative values", () => {
    expect(approximateFraction(-0.5)).toBeNull();
  });

  it("should return null for zero", () => {
    expect(approximateFraction(0)).toBeNull();
  });

  it("should return null for infinity", () => {
    expect(approximateFraction(Infinity)).toBeNull();
  });

  it("should return null for whole numbers (no fractional part)", () => {
    expect(approximateFraction(2)).toBeNull();
    expect(approximateFraction(5.0001)).toBeNull(); // effectively integer
  });

  it("should return null when whole part exceeds maxWhole", () => {
    expect(approximateFraction(5.5)).toBeNull(); // default maxWhole is 4
    expect(approximateFraction(10.25)).toBeNull();
  });

  it("should return null when value cannot be approximated within tolerance", () => {
    expect(approximateFraction(0.1)).toBeNull();
  });

  it("should respect custom denominators", () => {
    expect(approximateFraction(0.1, [10])).toEqual({
      type: "fraction",
      num: 1,
      den: 10,
    });
  });
});

describe("formatOutputValue", () => {
  const unitWithFractions = {
    name: "cup",
    type: "volume" as const,
    system: "ambiguous" as const,
    toBase: 236.588,
    aliases: ["cups"],
    fractions: { enabled: true },
  };

  const unitWithoutFractions = {
    name: "mL",
    type: "volume" as const,
    system: "metric" as const,
    toBase: 1,
    aliases: ["ml"],
  };

  it("should return fraction when unit supports fractions and value is approximable", () => {
    const result = formatOutputValue(1.5, unitWithFractions);
    expect(result).toEqual({ type: "fraction", num: 3, den: 2 });
  });

  it("should return decimal when unit does not support fractions", () => {
    const result = formatOutputValue(1.5, unitWithoutFractions);
    expect(result).toEqual({ type: "decimal", decimal: 1.5 });
  });

  it("should return decimal when value cannot be approximated as fraction", () => {
    // 0.15 cannot be approximated with the default denominators
    const result = formatOutputValue(0.15, unitWithFractions);
    expect(result.type).toBe("decimal");
  });
});
