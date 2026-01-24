import { describe, it, expect } from "vitest";

import {
  areUnitsConvertible,
  areUnitsGroupable,
} from "../src/units/compatibility";
import { resolveUnit } from "../src/units/definitions";
import { UnitDefinition } from "../src/types";

describe("areUnitsGroupable", () => {
  it("should return true for identical units", () => {
    const unitA: UnitDefinition = {
      name: "g",
      type: "mass",
      system: "metric",
      aliases: ["gram", "grams", "grammes"],
      toBase: 1,
    };
    const unitB: UnitDefinition = {
      name: "g",
      type: "mass",
      system: "metric",
      aliases: ["gram", "grams", "grammes"],
      toBase: 1,
    };
    expect(areUnitsGroupable(unitA, unitB)).toBe(true);
  });
  it("should return true for units of the same type and system", () => {
    const unitA: UnitDefinition = {
      name: "kg",
      type: "mass",
      system: "metric",
      aliases: ["kilogram", "kilograms", "kilogrammes", "kilos", "kilo"],
      toBase: 1000,
    };
    const unitB: UnitDefinition = {
      name: "g",
      type: "mass",
      system: "metric",
      aliases: ["gram", "grams", "grammes"],
      toBase: 1,
    };
    expect(areUnitsGroupable(unitA, unitB)).toBe(true);
  });
  it("should return false for units of different types or systems", () => {
    const unitA: UnitDefinition = {
      name: "oz",
      type: "mass",
      system: "US",
      aliases: ["ounce", "ounces"],
      toBase: 28.3495,
    };
    const unitB: UnitDefinition = {
      name: "ml",
      type: "volume",
      system: "metric",
      aliases: ["milliliter", "milliliters", "millilitre", "millilitres", "cc"],
      toBase: 1,
    };
    expect(areUnitsGroupable(unitA, unitB)).toBe(false);
  });
  it("should return true for ambiguous units compatible with metric units", () => {
    const unitA = resolveUnit("tsp");
    const unitB = resolveUnit("ml");
    expect(areUnitsGroupable(unitA, unitB)).toBe(true);
    expect(areUnitsGroupable(unitB, unitA)).toBe(true);
  });
});

describe("areUnitsConvertible", () => {
  it("should return true for identical units", () => {
    const unit = resolveUnit("g") as UnitDefinition;
    expect(areUnitsConvertible(unit, unit)).toBe(true);
  });
  it("should return true for units of the same type", () => {
    const unitA = resolveUnit("large") as UnitDefinition;
    const unitB = resolveUnit("small") as UnitDefinition;
    expect(areUnitsConvertible(unitA, unitB)).toBe(false);
  });
});
