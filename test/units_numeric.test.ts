import { describe, it, expect } from "vitest";

import { toRoundedDecimal } from "../src/quantities/numeric";

describe("toRoundedDecimal", () => {
  it("should round decimal values with 3 digits if precision not specified", () => {
    expect(toRoundedDecimal({ type: "decimal", decimal: 1.23456 })).toEqual({
      type: "decimal",
      decimal: 1.235,
    });
  });
  it("should round decimal values to specified precision", () => {
    expect(toRoundedDecimal({ type: "decimal", decimal: 1.23456 }, 2)).toEqual({
      type: "decimal",
      decimal: 1.23,
    });
  });
  it("should round fraction values with 3 digits if precision not specifiedn", () => {
    expect(toRoundedDecimal({ type: "fraction", num: 1, den: 3 })).toEqual({
      type: "decimal",
      decimal: 0.333,
    });
  });
});
