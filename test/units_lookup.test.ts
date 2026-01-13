import { describe, it, expect } from "vitest";

import {
  areUnitsCompatible,
  findListWithCompatibleQuantity,
  findCompatibleQuantityWithinList,
} from "../src/units/lookup";
import { UnitDefinition } from "../src/types";
import { qWithUnitDef } from "./mocks/quantity";

describe("areUnitsCompatible", () => {
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
    expect(areUnitsCompatible(unitA, unitB)).toBe(true);
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
    expect(areUnitsCompatible(unitA, unitB)).toBe(true);
  });
  it("should return false for units of different types or systems", () => {
    const unitA: UnitDefinition = {
      name: "oz",
      type: "mass",
      system: "imperial",
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
    expect(areUnitsCompatible(unitA, unitB)).toBe(false);
  });
});

describe("findListWithCompatibleQuantity", () => {
  const lists = [
    [qWithUnitDef(1, "small"), qWithUnitDef(10, "mL")],
    [qWithUnitDef(1, "bucket"), qWithUnitDef(5, "L")],
  ];

  // The user should explicitely provide the link between units of different systems
  it("should not consider a list containing a unit of same type but different system to be compatible", () => {
    expect(
      findListWithCompatibleQuantity(lists, qWithUnitDef(5, "cup")),
    ).toBeUndefined();
  });

  it("should find the first list containing a compatible quantity", () => {
    expect(
      findListWithCompatibleQuantity(lists, qWithUnitDef(5, "mL")),
    ).toEqual(lists[0]);
    expect(
      findListWithCompatibleQuantity(lists, qWithUnitDef(5, "bucket")),
    ).toEqual(lists[1]);
  });
});

describe("findCompatibleQuantityWithinList", () => {
  const list = [
    qWithUnitDef(1, "small"),
    qWithUnitDef(10, "mL"),
    qWithUnitDef(2, "cup"),
  ];

  it("should find a compatible quantity when the name is the same", () => {
    expect(
      findCompatibleQuantityWithinList(list, qWithUnitDef(5, "small")),
    ).toEqual(list[0]);
  });

  it("should find a compatible quantity when the type is the same", () => {
    expect(
      findCompatibleQuantityWithinList(list, qWithUnitDef(5, "tsp")),
    ).toEqual(list[1]);
    expect(
      findCompatibleQuantityWithinList(list, qWithUnitDef(1, "kg")),
    ).toBeUndefined();
  });

  it("should return undefined when the list is empty", () => {
    expect(
      findCompatibleQuantityWithinList([], qWithUnitDef(5, "mL")),
    ).toBeUndefined();
  });
});
