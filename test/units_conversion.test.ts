import { describe, it, expect } from "vitest";

import { qWithUnitDef } from "./mocks/quantity";
import Big from "big.js";
import { getUnitRatio, findBestUnit } from "../src/units/conversion";
import { normalizeUnit } from "../src/units/definitions";

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

describe("findBestUnit", () => {
  it("should prefer the smallest integer in input family", () => {
    // 0.5 pint + 0.5 pint = 1 pint or 2 cup
    const pintDef = normalizeUnit("pint")!;
    const cupDef = normalizeUnit("cup")!;
    const result = findBestUnit(473.2, "volume", "US", [pintDef]);
    expect(result.unit.name).toBe("pint");
    expect(result.value).toBeCloseTo(1);
    // 1 cup + 1 cup = 1 pint or 2 cup
    const result2 = findBestUnit(473.2, "volume", "US", [cupDef]);
    expect(result2.unit.name).toBe("cup");
    expect(result2.value).toBeCloseTo(2);
    //2 cup + 1 pint = 2 pint or 4 cup
    const result3 = findBestUnit(946.4, "volume", "US", [pintDef, cupDef]);
    expect(result3.unit.name).toBe("pint");
    expect(result3.value).toBeCloseTo(2);
  });
  it("should prefer integers in input family only if within human range", () => {
    // 240ml = 16tbsp (integer, in input family, but tbsp maxValue is 4, so excluded)
    const tbspDef = normalizeUnit("tbsp")!;
    const mlDef = normalizeUnit("ml")!;
    const result = findBestUnit(240, "volume", "metric", [tbspDef, mlDef]);
    expect(result.unit.name).toBe("ml");
    expect(result.value).toBe(240);
  });

  it("should prefer the smallest integer of all integers in any family over non-integers in input family", () => {
    // 236.6 ml = ~1 cup or ~8 fl-oz
    const mLDef = normalizeUnit("mL")!;
    const result = findBestUnit(236.6, "volume", "US", [mLDef]);
    expect(result.unit.name).toBe("cup");
    expect(result.value).toBeCloseTo(1);
    const goDef = normalizeUnit("go")!;
    const result2 = findBestUnit(15, "volume", "metric", [goDef]);
    expect(result2.unit.name).toBe("tbsp");
    expect(result2.value).toBeCloseTo(1);
    const result3 = findBestUnit(14.787, "volume", "US", [goDef]);
    expect(result3.unit.name).toBe("tbsp");
    expect(result3.value).toBeCloseTo(1);
    const result4 = findBestUnit(360, "volume", "JP", [goDef]);
    expect(result4.unit.name).toBe("go");
    expect(result4.value).toBe(2);
  });

  it("should prefer the smallest integer when multiple candidates", () => {
    const flozDef = normalizeUnit("fl-oz")!;
    const cupDef = normalizeUnit("cup")!;
    // 236.6 ml = ~1 cup or ~8 fl-oz
    const result = findBestUnit(236.6, "volume", "US", [flozDef, cupDef]);
    expect(result.unit.name).toBe("cup");
    expect(result.value).toBeCloseTo(1);
  });

  it("should handle non-integer values in range", () => {
    const mlDef = normalizeUnit("ml")!;
    const result = findBestUnit(1.5, "volume", "metric", [mlDef]);
    expect(result.unit.name).toBe("ml");
    expect(result.value).toBe(1.5);
  });

  it("should handle large values outside default max value for largest unit in system", () => {
    // 10,000,000ml = 10,000L (> 999)
    const mlDef = normalizeUnit("ml")!;
    const result = findBestUnit(10000000, "volume", "metric", [mlDef]);
    expect(result.unit.name).toBe("l");
    expect(result.value).toBe(10000);

    // 1,980ml = 11 go > max 10. Defaults to other metric units
    const goDef = normalizeUnit("go")!;
    const result2 = findBestUnit(1980, "volume", "JP", [goDef]);
    expect(result2.unit.name).toBe("l");
    expect(result2.value).toBe(1.98);
  });

  it("should consider fraction-representable values as in range for US units", () => {
    // 1.7ml with US system = ~0.345 tsp ≈ 1/3 tsp
    // tsp has fractions enabled, so 0.345 is considered in range (fraction approximation)
    // ml would be 1.7 (also in range), but tsp at ~1/3 is selected as smallest in range
    const flozDef = normalizeUnit("fl-oz")!;
    const result = findBestUnit(1.7, "volume", "US", [flozDef]);
    expect(result.unit.name).toBe("tsp");
    expect(result.value - 1 / 3).toBeLessThan((0.05 * 1) / 3); // within 5% accuracy
  });

  it("should fall back to non-fraction units when value cannot be approximated", () => {
    // 0.3ml with US system = ~0.06 tsp (too small for fraction approximation, min is 1/8 = 0.125)
    // ml: 0.3 (not in standard range, but ml doesn't have fractions enabled)
    // No candidate in range, so closest to range is selected
    const flozDef = normalizeUnit("fl-oz")!;
    const result = findBestUnit(0.3, "volume", "US", [flozDef]);
    // 0.3 ml is closest to range (distance to 1 is 0.7)
    // vs tsp at 0.06 (distance to 1 is 0.94)
    expect(result.unit.name).toBe("tsp");
    expect(result.value).toBeCloseTo(0.06, 2);
  });
});
