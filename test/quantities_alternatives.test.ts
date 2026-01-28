import { describe, it, expect } from "vitest";
import {
  addQuantitiesOrGroups,
  getEquivalentUnitsLists,
  sortUnitList,
  reduceOrsToFirstEquivalent,
  addEquivalentsAndSimplify,
  regroupQuantitiesAndExpandEquivalents,
} from "../src/quantities/alternatives";
import type {
  FlatOrGroup,
  QuantityWithExtendedUnit,
  QuantityWithUnitDef,
} from "../src/types";
import { q, qPlain, qWithUnitDef } from "./mocks/quantity";
import { toPlainUnit } from "../src/quantities/mutations";
import { NO_UNIT } from "../src/units/definitions";

describe("getEquivalentUnitsLists", () => {
  it("should consider units of the same system and type as similar", () => {
    expect(
      getEquivalentUnitsLists(
        { or: [q(1, "small"), q(10, "mL"), q(1, "cup")] },
        { or: [q(1, "large"), q(2, "cL"), q(1, "pint")] },
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
        { or: [q(1, "bucket")] },
        { or: [q(1, "mini"), q(1, "bag")] },
        q(1, "small"),
        q(1, "mini"),
        { or: [q(1, "small"), q(1, "cup")] },
        { or: [q(1, "large", true), q(0.75, "cup"), q(0.5, "pack")] },
      ),
    ).toEqual([
      [qWithUnitDef(1, "mini"), qWithUnitDef(1, "bag")],
      [
        qWithUnitDef(1, "small"),
        qWithUnitDef(1, "cup"),
        qWithUnitDef(1.33, "large", true),
        qWithUnitDef(0.667, "pack"),
      ],
    ]);
  });
});

describe("sortUnitList", () => {
  it("should sort integer-protected units with no-unit first, then others", () => {
    const unitList = [
      qWithUnitDef(1, "small", true),
      qWithUnitDef(2, NO_UNIT, true),
      qWithUnitDef(3, "large", true),
    ];
    expect(sortUnitList(unitList)).toEqual([
      qWithUnitDef(2, NO_UNIT, true),
      qWithUnitDef(3, "large", true),
      qWithUnitDef(1, "small", true),
    ]);
  });
  it("should sort integer-protected units before non-integer-protected no-unit", () => {
    const unitList = [qWithUnitDef(1, "small", true), qWithUnitDef(2, NO_UNIT)];
    expect(sortUnitList(unitList)).toEqual(unitList);
  });
  it("should sort units by integer-protection, type and system", () => {
    const unitList = [
      qWithUnitDef(1, "cup"),
      qWithUnitDef(2, "large", true),
      qWithUnitDef(3),
      qWithUnitDef(4, "small", true),
      qWithUnitDef(5, "pint"),
    ];
    expect(sortUnitList(unitList)).toEqual([
      qWithUnitDef(2, "large", true),
      qWithUnitDef(4, "small", true),
      qWithUnitDef(3),
      qWithUnitDef(1, "cup"),
      qWithUnitDef(5, "pint"),
    ]);
  });
});

describe("reduceOrsToFirstEquivalent", () => {
  const unitList = [
    [
      qWithUnitDef(2, "large", true),
      qWithUnitDef(1, NO_UNIT),
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
        { or: [q(2, "large"), q(1.5, "cup")] },
      ]),
    ).toEqual([q(2, "large")]);
  });
  it("should disregard order in the group", () => {
    expect(
      reduceOrsToFirstEquivalent(unitList, [
        { or: [q(2, "large"), q(1.5, "cup")] },
        { or: [q(1, "cup"), q(3, "large")] },
      ]),
    ).toEqual([q(2, "large"), q(3, "large")]);
  });
  it("should correctly reduce to the first integer-protected unit, even when the first quantity has no unit", () => {
    expect(
      reduceOrsToFirstEquivalent(unitList, [{ or: [q(2), q(3, "cup")] }]),
    ).toEqual([q(4, "large")]);
  });
  it("should reduce to the first unit provided, if it is an integer-protected one", () => {
    expect(
      reduceOrsToFirstEquivalent(unitList, [
        { or: [q(2, "small"), q(3, "cup")] },
      ]),
    ).toEqual([q(2, "small")]);
  });
  it("should handle units of different systems and types", () => {
    expect(
      reduceOrsToFirstEquivalent(
        [[qWithUnitDef(10, "mL"), qWithUnitDef(1, "cup")]],
        [
          { or: [q(10, "mL"), q(1, "cup")] },
          { or: [q(2, "cL"), q(1, "pint")] },
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
  it("should return correct values in case no quantities are passed", () => {
    const result = addQuantitiesOrGroups([]);
    expect(result).toEqual({
      sum: {
        ...q(0),
        unit: { name: "__no-unit__", type: "other", system: "none" },
      },
      unitsLists: [],
    });
  });
  it("should pass single quantities transparently", () => {
    const quantity: QuantityWithExtendedUnit = q(1, "kg");
    const result = addQuantitiesOrGroups([quantity]);
    expect(result.sum).toMatchObject({
      ...q(1, "kg"),
      unit: {
        name: "kg",
        type: "mass",
        system: "metric",
        aliases: ["kilogram", "kilograms", "kilogrammes", "kilos", "kilo"],
        toBase: 1000,
      },
    });
  });
  it("should reduce an OR group to its most relevant member", () => {
    const or: FlatOrGroup<QuantityWithExtendedUnit> = {
      or: [q(2, "large"), q(1.5, "cup")],
    };

    const { sum } = addQuantitiesOrGroups([or]);
    expect(sum).toEqual(qWithUnitDef(2, "large"));
  });
  it("should add two OR groups to the sum of their most relevant member", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      or: [q(2, "large"), q(1.5, "cup")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      or: [q(4, "large"), q(3, "cup")],
    };

    const { sum } = addQuantitiesOrGroups([or1, or2]);
    expect(sum).toEqual(qWithUnitDef(6, "large"));
  });
  it("should reduce two OR groups partially overlapping to the sum of the most relevant member of the union", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      or: [q(2, "large"), q(1.5, "cup")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      or: [q(2, "small"), q(1, "cup")],
    };

    const { sum } = addQuantitiesOrGroups([or1, or2]);
    expect(sum).toEqual(qWithUnitDef(3.33, "large"));
  });
  it("should handle OR groups with different normalizable units", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      or: [q(100, "ml"), q(1, "cup")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      or: [q(20, "cl"), q(1, "pint")],
    }; // 10 cl = 100 ml

    const { sum } = addQuantitiesOrGroups([or1, or2]);
    expect(sum).toEqual(qWithUnitDef(300, "ml"));
  });
});

describe("regroupQuantitiesAndExpandEquivalents", () => {
  // Processing a UnitList with only 1 quantity is purely theoretical and won't happen in practice
  it("simply passes on a single quantity", () => {
    const sum = qWithUnitDef(1, "kg");
    const unitsLists: QuantityWithUnitDef[][] = [[qWithUnitDef(1, "kg")]];
    expect(regroupQuantitiesAndExpandEquivalents(sum, unitsLists)).toEqual([
      q(1, "kg"),
    ]);
  });

  it("does not process more unit lists if a match has been found", () => {
    const sum = qWithUnitDef(4, "large");
    const unitsLists: QuantityWithUnitDef[][] = [
      [
        qWithUnitDef(2, "large"),
        qWithUnitDef(1, NO_UNIT),
        qWithUnitDef(1.5, "cup"),
        qWithUnitDef(3, "small", true),
      ],
      [qWithUnitDef(1, "bag"), qWithUnitDef(1, "mini")],
    ];
    expect(regroupQuantitiesAndExpandEquivalents(sum, unitsLists)).toEqual([
      { or: [q(4, "large"), q(6, "small"), q(2, NO_UNIT), q(3, "cup")] },
    ]);
  });
});

describe("addEquivalentsAndSimplify", () => {
  it("leaves Quantity's intact", () => {
    expect(addEquivalentsAndSimplify([q(2, "kg")])).toEqual(qPlain(2, "kg"));
    expect(addEquivalentsAndSimplify([q(2, "kg"), q(2, "large")])).toEqual({
      and: [qPlain(2, "kg"), qPlain(2, "large")],
    });
  });
  it("leaves single OR group intact", () => {
    const or: FlatOrGroup<QuantityWithExtendedUnit> = {
      or: [q(2, "kg"), q(2, "large")],
    };
    expect(addEquivalentsAndSimplify([or])).toEqual(toPlainUnit(or));
  });
  it("correctly adds two groups of equivalent quantities of same unit", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      or: [q(1, "kg"), q(2, "large")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      or: [q(1.5, "kg"), q(3, "large")],
    };
    expect(addEquivalentsAndSimplify([or1, or2])).toEqual({
      or: [qPlain(5, "large"), qPlain(2.5, "kg")],
    });
  });
  it("correctly adds two groups of equivalent quantities of similar unit", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      or: [q(1, "kg"), q(20, "large")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      or: [q(100, "g"), q(2, "large")],
    };
    expect(addEquivalentsAndSimplify([or1, or2])).toEqual({
      or: [qPlain(22, "large"), qPlain(1.1, "kg")],
    });
  });
  it("correctly adds two groups of equivalents with partial overlap", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      or: [q(2, "large"), q(1.5, "cup")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      or: [q(2, "small"), q(1, "cup")],
    };
    // 1.5 + 1 = 2.5 cups → 5/2 as fraction (cup has fractions enabled)
    expect(addEquivalentsAndSimplify([or1, or2])).toEqual({
      or: [
        qPlain(3.33, "large"),
        qPlain(5, "small"),
        {
          quantity: {
            type: "fixed",
            value: { type: "fraction", num: 5, den: 2 },
          },
          unit: "cup",
        },
      ],
    });
  });
  it("accepts units of the same type but different system as alternative", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      or: [q(10, "cup"), q(2366, "mL")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      or: [q(1, "pint"), q(473, "mL")],
    };
    // 10 cups + 1 pint = ~12 cups
    // Total base = 10*236.588 + 473.176 = 2839ml
    // Best unit selection prefers non-metric when system is US (inferred from ambiguous units)
    expect(addEquivalentsAndSimplify([or1, or2])).toEqual({
      or: [qPlain(12, "cup"), qPlain(2.84, "l")],
    });
  });
  it("correctly take integer-protected units into account", () => {
    const or1: FlatOrGroup<QuantityWithExtendedUnit> = {
      or: [q(2, "large", true), q(1.5, "cup")],
    };
    const or2: FlatOrGroup<QuantityWithExtendedUnit> = {
      or: [q(2, "small"), q(1, "cup")],
    };
    // 1.5 + 1 = 2.5 cups → 5/2 as fraction (cup has fractions enabled)
    expect(addEquivalentsAndSimplify([or1, or2])).toEqual({
      or: [
        { and: [qPlain(2, "large"), qPlain(2, "small")] },
        {
          quantity: {
            type: "fixed",
            value: { type: "fraction", num: 5, den: 2 },
          },
          unit: "cup",
        },
      ],
    });
  });
});
