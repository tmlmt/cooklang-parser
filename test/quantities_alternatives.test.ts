import { describe, it, expect } from "vitest";
import {
  addQuantitiesOrGroups,
  getEquivalentUnitsLists,
  reduceOrsToFirstEquivalent,
  addEquivalentsAndSimplify,
} from "../src/quantities/alternatives";
import type { FlatOrGroup, QuantityWithExtendedUnit } from "../src/types";
import { q, qPlain, qWithUnitDef } from "./mocks/quantity";
import { toPlainUnit } from "../src/quantities/mutations";

describe("getEquivalentUnitsLists", () => {
  it("should consider units of the same system and type as similar", () => {
    expect(
      getEquivalentUnitsLists(
        { type: "or", quantities: [q(1, "small"), q(10, "mL"), q(1, "cup")] },
        { type: "or", quantities: [q(1, "large"), q(2, "cL"), q(1, "pint")] },
      ),
    ).toEqual([
      [
        qWithUnitDef(1, "small"),
        qWithUnitDef(10, "mL"),
        qWithUnitDef(1, "cup"),
        qWithUnitDef(0.5, "large"),
      ],
    ]);
  });
  it("should return the correct list for complex quantity groups", () => {
    expect(
      getEquivalentUnitsLists(
        {
          type: "or",
          quantities: [q(1, "bucket")],
        },
        {
          type: "or",
          quantities: [q(1, "mini"), q(1, "bag")],
        },
        q(1, "small"),
        q(1, "mini"),
        { type: "or", quantities: [q(1, "small"), q(1, "cup")] },
        {
          type: "or",
          quantities: [q(1, "large", true), q(0.75, "cup"), q(0.5, "pack")],
        },
      ),
    ).toEqual([
      [qWithUnitDef(1, "mini"), qWithUnitDef(1, "bag")],
      [
        qWithUnitDef(1, "small"),
        qWithUnitDef(1, "cup"),
        qWithUnitDef(1.333, "large", true),
        qWithUnitDef(0.667, "pack"),
      ],
    ]);
  });
});

describe("reduceOrsToFirstEquivalent", () => {
  const unitList = [
    [
      qWithUnitDef(2, "large", true),
      qWithUnitDef(1.5, "cup"),
      qWithUnitDef(3, "small", true),
    ],
  ];
  it("should keep protected Quantity's intact", () => {
    expect(
      reduceOrsToFirstEquivalent(unitList, [q(2, "large"), q(5, "small")]),
    ).toEqual([q(2, "large"), q(5, "small")]);
  });
  it("should correctly reduce or groups to first protected unit", () => {
    expect(
      reduceOrsToFirstEquivalent(unitList, [
        { type: "or", quantities: [q(2, "large"), q(1.5, "cup")] },
      ]),
    ).toEqual([q(2, "large")]);
  });
  it("should disregard order in the group", () => {
    expect(
      reduceOrsToFirstEquivalent(unitList, [
        { type: "or", quantities: [q(2, "large"), q(1.5, "cup")] },
        { type: "or", quantities: [q(1, "cup"), q(3, "large")] },
      ]),
    ).toEqual([q(2, "large"), q(3, "large")]);
  });
  it("should handle units of different systems and types", () => {
    expect(
      reduceOrsToFirstEquivalent(
        [[qWithUnitDef(10, "mL"), qWithUnitDef(1, "cup")]],
        [
          { type: "or", quantities: [q(10, "mL"), q(1, "cup")] },
          { type: "or", quantities: [q(2, "cL"), q(1, "pint")] },
        ],
      ),
    ).toEqual([q(10, "mL"), q(20, "mL")]);
  });
  it("should correctly transform Quantity into first compatible protected unit quantity", () => {
    expect(reduceOrsToFirstEquivalent(unitList, [q(1.5, "cup")])).toEqual([
      q(2, "large"),
    ]);
    expect(reduceOrsToFirstEquivalent(unitList, [q(1, "cup")])).toEqual([
      q(2, "small"),
    ]);
  });
});

describe("addQuantitiesOrGroups", () => {
  it("should reduce an OR group to its most relevant member", () => {
    const or: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(2, "large"), q(1.5, "cup")],
    };

    const { sum } = addQuantitiesOrGroups(or);
    expect(sum).toEqual(qWithUnitDef(2, "large"));
  });
  it("should add two OR groups to the sum of their most relevant member", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(2, "large"), q(1.5, "cup")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(4, "large"), q(3, "cup")],
    };

    const { sum } = addQuantitiesOrGroups(or1, or2);
    expect(sum).toEqual(qWithUnitDef(6, "large"));
  });
  it("should reduce two OR groups partially overlapping to the sum of the most relevant member of the union", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(2, "large"), q(1.5, "cup")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(2, "small"), q(1, "cup")],
    };

    const { sum } = addQuantitiesOrGroups(or1, or2);
    expect(sum).toEqual(qWithUnitDef(3.333, "large"));
  });
  it("should handle OR groups with different normalizable units", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(100, "ml"), q(1, "cup")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(20, "cl"), q(1, "pint")],
    }; // 10 cl = 100 ml

    const { sum } = addQuantitiesOrGroups(or1, or2);
    expect(sum).toEqual(qWithUnitDef(300, "ml"));
  });
});

describe("addEquivalentsAndSimplify", () => {
  it("leaves Quantity's intact", () => {
    expect(addEquivalentsAndSimplify(q(2, "kg"))).toEqual(qPlain(2, "kg"));
    expect(addEquivalentsAndSimplify(q(2, "kg"), q(2, "large"))).toEqual({
      type: "and",
      quantities: [qPlain(2, "kg"), qPlain(2, "large")],
    });
  });
  it("leaves single OR group intact", () => {
    const or: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(2, "kg"), q(2, "large")],
    };
    expect(addEquivalentsAndSimplify(or)).toEqual(toPlainUnit(or));
  });
  it("correctly adds two groups of equivalent quantities of same unit", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(1, "kg"), q(2, "large")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(1.5, "kg"), q(3, "large")],
    };
    expect(addEquivalentsAndSimplify(or1, or2)).toEqual({
      type: "or",
      quantities: [qPlain(5, "large"), qPlain(2.5, "kg")],
    });
  });
  it("correctly adds two groups of equivalent quantities of similar unit", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(1, "kg"), q(20, "large")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(100, "g"), q(2, "large")],
    };
    expect(addEquivalentsAndSimplify(or1, or2)).toEqual({
      type: "or",
      quantities: [qPlain(22, "large"), qPlain(1.1, "kg")],
    });
  });
  it("correctly adds two groups of equivalents with partial overlap", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(2, "large"), q(1.5, "cup")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(2, "small"), q(1, "cup")],
    };
    expect(addEquivalentsAndSimplify(or1, or2)).toEqual({
      type: "or",
      quantities: [
        qPlain(3.333, "large"),
        qPlain(5, "small"),
        qPlain(2.5, "cup"),
      ],
    });
  });
  it("accepts units of the same type but different system as alternative", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(10, "cup"), q(2366, "mL")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(1, "pint"), q(473, "mL")],
    };
    expect(addEquivalentsAndSimplify(or1, or2)).toEqual({
      type: "or",
      quantities: [qPlain(12, "cup"), qPlain(2839.2, "mL")],
    });
  });
  it("correctly take integer-protected units into account", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(2, "large", true), q(1.5, "cup")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      type: "or",
      quantities: [q(2, "small"), q(1, "cup")],
    };
    expect(addEquivalentsAndSimplify(or1, or2)).toEqual({
      type: "or",
      quantities: [
        { type: "and", quantities: [qPlain(2, "large"), qPlain(2, "small")] },
        qPlain(2.5, "cup"),
      ],
    });
  });
});
