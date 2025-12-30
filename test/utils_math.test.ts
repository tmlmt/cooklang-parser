import { describe, it, expect } from "vitest";

import { qWithUnitDef } from "./mocks/quantity";
import Big from "big.js";
import { getAverageValue, getUnitRatio } from "../src/utils/math";

describe("getAverageValue", () => {
  it("should return the correct value for fixed values", () => {
    expect(
      getAverageValue({
        type: "fixed",
        value: { type: "decimal", decimal: 1 },
      }),
    ).toBe(1);
  });
  it("should return the correct value for ranges", () => {
    expect(
      getAverageValue({
        type: "range",
        min: { type: "decimal", decimal: 1 },
        max: { type: "decimal", decimal: 2 },
      }),
    ).toBe(1.5);
  });
  it("should return the correct value for text values", () => {
    expect(
      getAverageValue({ type: "fixed", value: { type: "text", text: "two" } }),
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
          quantity: { type: "fixed", value: { type: "text", text: "two" } },
          unit: { name: "large", type: "other", system: "none" },
        },
        qWithUnitDef(1, "cup"),
      ),
    ).toThrowError();
  });
});
