import { describe, it, expect } from "vitest";

import {
  findCompatibleQuantityWithinList,
  findListWithCompatibleQuantity,
} from "../src/units/lookup";
import { qWithUnitDef } from "./mocks/quantity";

describe("findListWithCompatibleQuantity", () => {
  const lists = [
    [qWithUnitDef(1, "small"), qWithUnitDef(10, "mL")],
    [qWithUnitDef(1, "bucket"), qWithUnitDef(5, "L")],
  ];

  // The user should explicitly provide the link between units of different systems
  // cup is US system mass, g is metric system mass - these should not auto-match for grouping
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
