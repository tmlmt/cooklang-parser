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

  it("should prefer the smallest integer of all integers in any family over non-integers in input family (when input family unit has no fractions)", () => {
    // 5ml, input family = cl (no `fractions` defined).
    // cl -> 0.5: non-integer, <1, and cl has no fractions, so it's excluded from range entirely.
    // ml -> 5 and 小さじ -> 1 are both integers from other families; smallest (小さじ) wins.
    const clDef = normalizeUnit("cl")!;
    const result = findBestUnit(5, "volume", "JP", [clDef]);
    expect(result.unit.name).toBe("小さじ");
    expect(result.value).toBeCloseTo(1);

    // Same mechanism for mass: 700g, input family = kg (no fractions).
    // kg -> 0.7: non-integer, <1, no fractions => excluded. g -> 700: integer, in range, wins.
    const kgDef = normalizeUnit("kg")!;
    const result2 = findBestUnit(700, "mass", "metric", [kgDef]);
    expect(result2.unit.name).toBe("g");
    expect(result2.value).toBe(700);
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

  it("should prefer non-integer values in input family over others", () => {
    // 352ml in US: fl-oz ≈ 11.90, cup ≈ 1.49 — both non-integer, both in range
    // fl-oz is in input family, so it should be preferred
    const flozDef = normalizeUnit("fl-oz")!;
    const result = findBestUnit(352, "volume", "US", [flozDef]);
    expect(result.unit.name).toBe("fl-oz");
    expect(result.value).toBeCloseTo(11.9, 1);
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

  it("should prefer non-integer value in input family over integer in another family (Option B)", () => {
    // 118.294 ml = 0.5 cup (fraction, input family) vs 4 fl-oz (integer, other family)
    // Priority 2: non-integer in input family wins → cup
    const cupDef = normalizeUnit("cup")!;
    const result = findBestUnit(118.294, "volume", "US", [cupDef]);
    expect(result.unit.name).toBe("cup");
    expect(result.value).toBeCloseTo(0.5);

    // 0.5 lb (input family) vs 8 oz (integer, other family)
    const lbDef = normalizeUnit("lb")!;
    const result2 = findBestUnit(226.796, "mass", "US", [lbDef]);
    expect(result2.unit.name).toBe("lb");
    expect(result2.value).toBeCloseTo(0.5);

    // 1.5 cups (input family, non-integer) vs 12 fl-oz (integer, other family)
    const result3 = findBestUnit(354.882, "volume", "US", [cupDef]);
    expect(result3.unit.name).toBe("cup");
    expect(result3.value).toBeCloseTo(1.5);
  });

  it("should sort multiple non-integer input-family candidates by largest value first", () => {
    // 350ml in US, input=[cup, fl-oz]: cup≈1.479, fl-oz≈11.834 — both non-integer, both in range
    // Sort descending by value → fl-oz wins (exercises the sort comparator when 2+ candidates)
    const cupDef = normalizeUnit("cup")!;
    const flozDef = normalizeUnit("fl-oz")!;
    const result = findBestUnit(350, "volume", "US", [cupDef, flozDef]);
    expect(result.unit.name).toBe("fl-oz");
    expect(result.value).toBeCloseTo(11.83, 1);
  });

  it("should pick smallest non-integer in range when input unit is out of range", () => {
    // 30ml in US with tsp as input: tsp≈6.09 is above maxValue(5) so out of range.
    // fl-oz≈1.015 and tbsp≈2.03 are both non-integer and in range but not in input family.
    // Fourth priority picks smallest: fl-oz=1.015 < tbsp=2.03
    const tspDef = normalizeUnit("tsp")!;
    const result = findBestUnit(30, "volume", "US", [tspDef]);
    expect(result.unit.name).toBe("fl-oz");
    expect(result.value).toBeCloseTo(1.015, 2);
  });
});
