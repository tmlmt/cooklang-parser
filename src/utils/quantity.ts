import type {
  FixedValue,
  Range,
  DecimalValue,
  FractionValue,
  Unit,
  UnitDefinition,
  UnitDefinitionLike,
  QuantityWithPlainUnit,
  QuantityWithExtendedUnit,
  QuantityWithUnitDef,
  MaybeNestedGroup,
} from "../types";
import {
  units,
  normalizeUnit,
  getNormalizedUnit,
} from "../models/unit_definitions";
import {
  getNumericValue,
  addNumericValues,
  multiplyQuantityValue,
} from "./numeric";
import { CannotAddTextValueError, IncompatibleUnitsError } from "../errors";
import Big from "big.js";
import { isGroup, isQuantity } from "./type_guards";

export function deNormalizeQuantity(
  q: QuantityWithUnitDef,
): QuantityWithExtendedUnit {
  const result: QuantityWithExtendedUnit = {
    quantity: q.quantity,
  };
  if (q.unit.name !== "__no-unit__") {
    result.unit = { name: q.unit.name };
  }
  return result;
}

export function extendAllUnits(
  q: QuantityWithPlainUnit | MaybeNestedGroup<QuantityWithPlainUnit>,
): QuantityWithExtendedUnit | MaybeNestedGroup<QuantityWithExtendedUnit> {
  if (isGroup(q)) {
    return { ...q, quantities: q.quantities.map(extendAllUnits) };
  } else {
    const newQ: QuantityWithExtendedUnit = {
      quantity: q.quantity,
    };
    if (q.unit) {
      newQ.unit = { name: q.unit };
    }
    return newQ;
  }
}

export function normalizeAllUnits(
  q: QuantityWithPlainUnit | MaybeNestedGroup<QuantityWithPlainUnit>,
): QuantityWithUnitDef | MaybeNestedGroup<QuantityWithUnitDef> {
  if (isGroup(q)) {
    return { ...q, quantities: q.quantities.map(normalizeAllUnits) };
  } else {
    const newQ: QuantityWithUnitDef = {
      quantity: q.quantity,
      unit: getNormalizedUnit(q.unit),
    };
    return newQ;
  }
}

export const convertQuantityValue = (
  value: FixedValue | Range,
  def: UnitDefinition,
  targetDef: UnitDefinition,
): FixedValue | Range => {
  if (def.name === targetDef.name) return value;

  const factor = def.toBase / targetDef.toBase;

  return multiplyQuantityValue(value, factor);
};

/**
 * Get the default / neutral quantity which can be provided to addQuantity
 * for it to return the other value as result
 *
 * @return zero
 */
export function getDefaultQuantityValue(): FixedValue {
  return { type: "fixed", value: { type: "decimal", decimal: 0 } };
}

/**
 * Adds two quantity values together.
 *
 * - Adding two {@link FixedValue}s returns a new {@link FixedValue}.
 * - Adding a {@link Range} to any value returns a {@link Range}.
 *
 * @param v1 - The first quantity value.
 * @param v2 - The second quantity value.
 * @returns A new quantity value representing the sum.
 */
export function addQuantityValues(v1: FixedValue, v2: FixedValue): FixedValue;
export function addQuantityValues(
  v1: FixedValue | Range,
  v2: FixedValue | Range,
): Range;

export function addQuantityValues(
  v1: FixedValue | Range,
  v2: FixedValue | Range,
): FixedValue | Range {
  if (
    (v1.type === "fixed" && v1.value.type === "text") ||
    (v2.type === "fixed" && v2.value.type === "text")
  ) {
    throw new CannotAddTextValueError();
  }

  if (v1.type === "fixed" && v2.type === "fixed") {
    const res = addNumericValues(
      v1.value as DecimalValue | FractionValue,
      v2.value as DecimalValue | FractionValue,
    );
    return { type: "fixed", value: res };
  }
  const r1 =
    v1.type === "range" ? v1 : { type: "range", min: v1.value, max: v1.value };
  const r2 =
    v2.type === "range" ? v2 : { type: "range", min: v2.value, max: v2.value };
  const newMin = addNumericValues(
    r1.min as DecimalValue | FractionValue,
    r2.min as DecimalValue | FractionValue,
  );
  const newMax = addNumericValues(
    r1.max as DecimalValue | FractionValue,
    r2.max as DecimalValue | FractionValue,
  );
  return { type: "range", min: newMin, max: newMax };
}

/**
 * Adds two quantities, returning the result in the most appropriate unit.
 */
export function addQuantities(
  q1: QuantityWithExtendedUnit,
  q2: QuantityWithExtendedUnit,
): QuantityWithExtendedUnit {
  const v1 = q1.quantity;
  const v2 = q2.quantity;
  // Case 1: one of the two values is a text, we throw an error we can catch on the other end
  if (
    (v1.type === "fixed" && v1.value.type === "text") ||
    (v2.type === "fixed" && v2.value.type === "text")
  ) {
    throw new CannotAddTextValueError();
  }

  const unit1Def = normalizeUnit(q1.unit?.name);
  const unit2Def = normalizeUnit(q2.unit?.name);

  const addQuantityValuesAndSetUnit = (
    val1: FixedValue | Range,
    val2: FixedValue | Range,
    unit?: Unit,
  ): QuantityWithExtendedUnit => ({
    quantity: addQuantityValues(val1, val2),
    unit,
  });

  // Case 2: one of the two values doesn't have a unit, we preserve its value and consider its unit to be that of the other one
  // If at least one of the two units is "", this preserves it versus setting the resulting unit as undefined
  if (
    (q1.unit?.name === "" || q1.unit === undefined) &&
    q2.unit !== undefined
  ) {
    return addQuantityValuesAndSetUnit(v1, v2, q2.unit); // Prefer q2's unit
  }
  if (
    (q2.unit?.name === "" || q2.unit === undefined) &&
    q1.unit !== undefined
  ) {
    return addQuantityValuesAndSetUnit(v1, v2, q1.unit); // Prefer q1's unit
  }

  // Case 3: the two quantities have the exact same unit
  if (
    (!q1.unit && !q2.unit) ||
    (q1.unit &&
      q2.unit &&
      q1.unit.name.toLowerCase() === q2.unit.name.toLowerCase())
  ) {
    return addQuantityValuesAndSetUnit(v1, v2, q1.unit);
  }

  // Case 4: the two quantities have different units of known type
  if (unit1Def && unit2Def) {
    // Case 4.1: different unit type => we can't add quantities
    if (unit1Def.type !== unit2Def.type) {
      throw new IncompatibleUnitsError(
        `${unit1Def.type} (${q1.unit?.name})`,
        `${unit2Def.type} (${q2.unit?.name})`,
      );
    }

    let targetUnitDef: UnitDefinition;

    // Case 4.2: same unit type but different system => we convert to metric
    if (unit1Def.system !== unit2Def.system) {
      const metricUnitDef = unit1Def.system === "metric" ? unit1Def : unit2Def;
      targetUnitDef = units
        .filter((u) => u.type === metricUnitDef.type && u.system === "metric")
        .reduce((prev, current) =>
          prev.toBase > current.toBase ? prev : current,
        );
    }
    // Case 4.3: same unit type, same system but different unit => we use the biggest unit of the two
    else {
      targetUnitDef = unit1Def.toBase >= unit2Def.toBase ? unit1Def : unit2Def;
    }
    const convertedV1 = convertQuantityValue(v1, unit1Def, targetUnitDef);
    const convertedV2 = convertQuantityValue(v2, unit2Def, targetUnitDef);
    const targetUnit: Unit = { name: targetUnitDef.name };
    if (q1.unit?.integerProtected || q2.unit?.integerProtected) {
      targetUnit.integerProtected = true;
    }

    return addQuantityValuesAndSetUnit(convertedV1, convertedV2, targetUnit);
  }

  // Case 5: the two quantities have different units of unknown type
  throw new IncompatibleUnitsError(
    q1.unit?.name as string,
    q2.unit?.name as string,
  );
}

export function getAverageValue(q: FixedValue | Range): string | number {
  if (q.type === "fixed") {
    return q.value.type === "text" ? q.value.text : getNumericValue(q.value);
  } else {
    return (getNumericValue(q.min) + getNumericValue(q.max)) / 2;
  }
}

export function getUnitRatio(q1: QuantityWithUnitDef, q2: QuantityWithUnitDef) {
  const q1Value = getAverageValue(q1.quantity);
  const q2Value = getAverageValue(q2.quantity);
  const factor =
    "toBase" in q1.unit && "toBase" in q2.unit
      ? q1.unit.toBase / q2.unit.toBase
      : 1;

  if (typeof q1Value !== "number" || typeof q2Value !== "number") {
    throw Error(
      "One of both values is not a number, so a ratio cannot be computed",
    );
  }
  return Big(q1Value).times(factor).div(q2Value);
}

export function getBaseUnitRatio(
  q: QuantityWithUnitDef,
  qRef: QuantityWithUnitDef,
) {
  if ("toBase" in q.unit && "toBase" in qRef.unit) {
    return q.unit.toBase / qRef.unit.toBase;
  } else {
    return 1;
  }
}

export function areUnitsCompatible(
  u1: UnitDefinitionLike,
  u2: UnitDefinitionLike,
): boolean {
  if (u1.name === u2.name) {
    return true;
  }
  if (u1.type !== "other" && u1.type === u2.type && u1.system === u2.system) {
    return true;
  }
  return false;
}

export function isValueIntegerLike(q: FixedValue | Range) {
  let result = false;
  if (q.type === "fixed") {
    if (q.value.type === "decimal") return Number.isInteger(q.value.decimal);
    if (q.value.type === "fraction")
      return Number.isInteger(q.value.num / q.value.den);
  } else {
    if (q.min.type === "decimal")
      result = result ? Number.isInteger(q.min.decimal) : false;
    if (q.min.type === "fraction")
      result = result ? Number.isInteger(q.min.num / q.min.den) : false;
    if (q.max.type === "decimal")
      result = result ? Number.isInteger(q.max.decimal) : false;
    if (q.max.type === "fraction")
      result = result ? Number.isInteger(q.max.num / q.max.den) : false;
  }
  return result;
}

export function findListWithCompatibleQuantity(
  list: QuantityWithUnitDef[][],
  quantity: QuantityWithExtendedUnit,
) {
  const quantityWithUnitDef = {
    ...quantity,
    unit: getNormalizedUnit(quantity.unit?.name),
  };
  return list.find((l) =>
    l.some((lq) => areUnitsCompatible(lq.unit, quantityWithUnitDef.unit)),
  );
}

export function findCompatibleQuantityWithinList(
  list: QuantityWithUnitDef[],
  quantity: QuantityWithExtendedUnit,
) {
  const quantityWithUnitDef = {
    ...quantity,
    unit: getNormalizedUnit(quantity.unit?.name),
  };
  if (!list) return undefined;
  return list.find(
    (q) =>
      q.unit.name === quantityWithUnitDef.unit.name ||
      (q.unit.type === quantityWithUnitDef.unit.type &&
        q.unit.type !== "other"),
  );
}

export function sortUnitList(list: QuantityWithUnitDef[]) {
  if (!list || list.length <= 1) return list;
  const priorityList: QuantityWithUnitDef[] = [];
  const nonPriorityList: QuantityWithUnitDef[] = [];
  for (const q of list) {
    if (q.unit.integerProtected || q.unit.system === "none") {
      priorityList.push(q);
    } else {
      nonPriorityList.push(q);
    }
  }

  return priorityList
    .sort((a, b) => {
      let prefixA = "";
      if (a.unit.integerProtected) prefixA = "___";
      else if (a.unit.system === "none") prefixA = "__";
      let prefixB = "";
      if (b.unit.integerProtected) prefixB = "___";
      else if (b.unit.system === "none") prefixB = "__";
      return (prefixA + a.unit.name).localeCompare(prefixB + b.unit.name);
    })
    .concat(nonPriorityList);
}

export function toPlainUnit(
  quantity:
    | QuantityWithExtendedUnit
    | MaybeNestedGroup<QuantityWithExtendedUnit>,
): QuantityWithPlainUnit | MaybeNestedGroup<QuantityWithPlainUnit> {
  if (isQuantity(quantity))
    return quantity.unit
      ? { ...quantity, unit: quantity.unit.name }
      : (quantity as QuantityWithPlainUnit);
  else {
    return {
      ...quantity,
      quantities: quantity.quantities.map(toPlainUnit),
    } as MaybeNestedGroup<QuantityWithPlainUnit>;
  }
}
