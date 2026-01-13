import { describe, it, expect } from "vitest";

import { qWithUnitDef } from "./mocks/quantity";
import Big from "big.js";
import { getUnitRatio } from "../src/units/conversion";

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
