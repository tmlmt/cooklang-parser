import type { FixedValue, Range, DecimalValue, FractionValue } from "./types";
import Big from "big.js";
export type UnitType = "mass" | "volume" | "count";
export type UnitSystem = "metric" | "imperial";

export interface Unit {
  name: string;
  integerProtected?: boolean;
}

export interface UnitDefinition extends Unit {
  type: UnitType;
  system: UnitSystem;
  aliases: string[]; // e.g. ['gram', 'grams']
  toBase: number; // conversion factor to the base unit of its type
}

export type UnitDefinitionLike =
  | UnitDefinition
  | { name: string; type: "other"; system: "none"; integerProtected?: boolean };

export interface QuantityBase {
  quantity: FixedValue | Range;
}

export interface QuantityWithPlainUnit extends QuantityBase {
  unit?: string;
}

export interface QuantityWithExtendedUnit extends QuantityBase {
  unit?: Unit;
}

export interface QuantityWithUnitDef extends QuantityBase {
  unit: UnitDefinitionLike;
}

type QuantityWithUnitLike =
  | QuantityWithPlainUnit
  | QuantityWithExtendedUnit
  | QuantityWithUnitDef;

export interface FlatOrGroup<T = QuantityWithUnitLike> {
  type: "or";
  quantities: T[];
}
export interface MaybeNestedOrGroup<T = QuantityWithUnitLike> {
  type: "or";
  quantities: (T | MaybeNestedGroup<T>)[];
}

export interface FlatAndGroup<T = QuantityWithUnitLike> {
  type: "and";
  quantities: T[];
}
export interface NestedAndGroup<T = QuantityWithUnitLike> {
  type: "and";
  quantities: T[];
}
export interface MaybeNestedAndGroup<T = QuantityWithUnitLike> {
  type: "and";
  quantities: (T | MaybeNestedGroup<T>)[];
}

export type FlatGroup<T = QuantityWithUnitLike> =
  | FlatAndGroup<T>
  | FlatOrGroup<T>;
export type MaybeNestedGroup<T = QuantityWithUnitLike> =
  | MaybeNestedAndGroup<T>
  | MaybeNestedOrGroup<T>;
export type Group<T = QuantityWithUnitLike> =
  | MaybeNestedGroup<T>
  | FlatGroup<T>;
export type OrGroup<T = QuantityWithUnitLike> =
  | MaybeNestedOrGroup<T>
  | FlatOrGroup<T>;
export type AndGroup<T = QuantityWithUnitLike> =
  | MaybeNestedAndGroup<T>
  | FlatAndGroup<T>;

// Base units: mass -> gram (g), volume -> milliliter (ml)
const units: UnitDefinition[] = [
  // Mass (Metric)
  {
    name: "g",
    type: "mass",
    system: "metric",
    aliases: ["gram", "grams", "grammes"],
    toBase: 1,
  },
  {
    name: "kg",
    type: "mass",
    system: "metric",
    aliases: ["kilogram", "kilograms", "kilogrammes", "kilos", "kilo"],
    toBase: 1000,
  },
  // Mass (Imperial)
  {
    name: "oz",
    type: "mass",
    system: "imperial",
    aliases: ["ounce", "ounces"],
    toBase: 28.3495,
  },
  {
    name: "lb",
    type: "mass",
    system: "imperial",
    aliases: ["pound", "pounds"],
    toBase: 453.592,
  },

  // Volume (Metric)
  {
    name: "ml",
    type: "volume",
    system: "metric",
    aliases: ["milliliter", "milliliters", "millilitre", "millilitres", "cc"],
    toBase: 1,
  },
  {
    name: "cl",
    type: "volume",
    system: "metric",
    aliases: ["centiliter", "centiliters", "centilitre", "centilitres"],
    toBase: 10,
  },
  {
    name: "dl",
    type: "volume",
    system: "metric",
    aliases: ["deciliter", "deciliters", "decilitre", "decilitres"],
    toBase: 100,
  },
  {
    name: "l",
    type: "volume",
    system: "metric",
    aliases: ["liter", "liters", "litre", "litres"],
    toBase: 1000,
  },
  {
    name: "tsp",
    type: "volume",
    system: "metric",
    aliases: ["teaspoon", "teaspoons"],
    toBase: 5,
  },
  {
    name: "tbsp",
    type: "volume",
    system: "metric",
    aliases: ["tablespoon", "tablespoons"],
    toBase: 15,
  },

  // Volume (Imperial)
  {
    name: "fl-oz",
    type: "volume",
    system: "imperial",
    aliases: ["fluid ounce", "fluid ounces"],
    toBase: 29.5735,
  },
  {
    name: "cup",
    type: "volume",
    system: "imperial",
    aliases: ["cups"],
    toBase: 236.588,
  },
  {
    name: "pint",
    type: "volume",
    system: "imperial",
    aliases: ["pints"],
    toBase: 473.176,
  },
  {
    name: "quart",
    type: "volume",
    system: "imperial",
    aliases: ["quarts"],
    toBase: 946.353,
  },
  {
    name: "gallon",
    type: "volume",
    system: "imperial",
    aliases: ["gallons"],
    toBase: 3785.41,
  },

  // Count units (no conversion, but recognized as a type)
  {
    name: "piece",
    type: "count",
    system: "metric",
    aliases: ["pieces", "pc"],
    toBase: 1,
  },
];

const unitMap = new Map<string, UnitDefinition>();
for (const unit of units) {
  unitMap.set(unit.name.toLowerCase(), unit);
  for (const alias of unit.aliases) {
    unitMap.set(alias.toLowerCase(), unit);
  }
}

export function normalizeUnit(unit: string = ""): UnitDefinition | undefined {
  return unitMap.get(unit.toLowerCase().trim());
}

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

export function getNormalizedUnit(
  unit: string = "__no-unit__",
): UnitDefinitionLike {
  const normalizedUnit = normalizeUnit(unit);
  return normalizedUnit
    ? { ...normalizedUnit, name: unit }
    : { name: unit, type: "other", system: "none" };
}

export class StrictUnitError extends Error {
  constructor(unit: string) {
    super(
      `Unit ${unit} is strict, and the values provided have different units so they cannot be added`,
    );
    this.name = "StrictUnitError";
  }
}

export class CannotAddTextValueError extends Error {
  constructor() {
    super("Cannot add a quantity with a text value.");
    this.name = "CannotAddTextValueError";
  }
}

export class IncompatibleUnitsError extends Error {
  constructor(unit1: string, unit2: string) {
    super(
      `Cannot add quantities with incompatible or unknown units: ${unit1} and ${unit2}`,
    );
    this.name = "IncompatibleUnitsError";
  }
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function simplifyFraction(
  num: number,
  den: number,
): DecimalValue | FractionValue {
  if (den === 0) {
    throw new Error("Denominator cannot be zero.");
  }

  const commonDivisor = gcd(Math.abs(num), Math.abs(den));
  let simplifiedNum = num / commonDivisor;
  let simplifiedDen = den / commonDivisor;
  if (simplifiedDen < 0) {
    simplifiedNum = -simplifiedNum;
    simplifiedDen = -simplifiedDen;
  }

  if (simplifiedDen === 1) {
    return { type: "decimal", decimal: simplifiedNum };
  } else {
    return { type: "fraction", num: simplifiedNum, den: simplifiedDen };
  }
}

export function getNumericValue(v: DecimalValue | FractionValue): number {
  // TODO: rename NumericValue to NumericalValue for all relevant functions
  if (v.type === "decimal") {
    return v.decimal;
  }
  return v.num / v.den;
}

export function multiplyNumericValue(
  v: DecimalValue | FractionValue,
  factor: number | Big,
): DecimalValue | FractionValue {
  if (v.type === "decimal") {
    return {
      type: "decimal",
      decimal: Big(v.decimal).times(factor).toNumber(),
    };
  }
  return simplifyFraction(Big(v.num).times(factor).toNumber(), v.den);
}

export function addNumericValues(
  val1: DecimalValue | FractionValue,
  val2: DecimalValue | FractionValue,
): DecimalValue | FractionValue {
  let num1: number;
  let den1: number;
  let num2: number;
  let den2: number;

  if (val1.type === "decimal") {
    num1 = val1.decimal;
    den1 = 1;
  } else {
    num1 = val1.num;
    den1 = val1.den;
  }

  if (val2.type === "decimal") {
    num2 = val2.decimal;
    den2 = 1;
  } else {
    num2 = val2.num;
    den2 = val2.den;
  }

  // Return 0 if both values are 0
  if (num1 === 0 && num2 === 0) {
    return { type: "decimal", decimal: 0 };
  }

  // We only return a fraction where both input values are fractions themselves or only one while the other is 0
  if (
    (val1.type === "fraction" && val2.type === "fraction") ||
    (val1.type === "fraction" &&
      val2.type === "decimal" &&
      val2.decimal === 0) ||
    (val2.type === "fraction" && val1.type === "decimal" && val1.decimal === 0)
  ) {
    const commonDen = den1 * den2;
    const sumNum = num1 * den2 + num2 * den1;
    return simplifyFraction(sumNum, commonDen);
  } else {
    return {
      type: "decimal",
      decimal: Big(num1).div(den1).add(Big(num2).div(den2)).toNumber(),
    };
  }
}

const toRoundedDecimal = (v: DecimalValue | FractionValue): DecimalValue => {
  const value = v.type === "decimal" ? v.decimal : v.num / v.den;
  return { type: "decimal", decimal: Math.round(value * 1000) / 1000 };
};

export function multiplyQuantityValue(
  value: FixedValue | Range,
  factor: number | Big,
): FixedValue | Range {
  if (value.type === "fixed") {
    const newValue = multiplyNumericValue(
      value.value as DecimalValue | FractionValue,
      Big(factor),
    );
    if (
      factor === parseInt(factor.toString()) || // e.g. 2 === int
      Big(1).div(factor).toNumber() === parseInt(Big(1).div(factor).toString()) // e.g. 0.25 => 4 === int
    ) {
      // Preserve fractions
      return {
        type: "fixed",
        value: newValue,
      };
    }
    // We might multiply with big decimal number so rounding into decimal value
    return {
      type: "fixed",
      value: toRoundedDecimal(newValue),
    };
  }

  return {
    type: "range",
    min: multiplyNumericValue(value.min, factor),
    max: multiplyNumericValue(value.max, factor),
  };
}

const convertQuantityValue = (
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

// Helper type-checks (as before)
export function isGroup(x: QuantityWithUnitLike | Group): x is Group {
  return x && "type" in x;
}
export function isOrGroup(x: QuantityWithUnitLike | Group): x is OrGroup {
  return isGroup(x) && x.type === "or";
}
export function isAndGroup(x: QuantityWithUnitLike | Group): x is AndGroup {
  return isGroup(x) && x.type === "and";
}
export function isQuantity(
  x: QuantityWithUnitLike | Group,
): x is QuantityWithUnitLike {
  return x && typeof x === "object" && "quantity" in x;
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

export function getEquivalentUnitsLists(
  ...quantities: (
    | QuantityWithExtendedUnit
    | FlatOrGroup<QuantityWithExtendedUnit>
  )[]
): QuantityWithUnitDef[][] {
  const quantitiesCopy = JSON.parse(JSON.stringify(quantities)) as (
    | QuantityWithExtendedUnit
    | FlatOrGroup<QuantityWithExtendedUnit>
  )[];

  const OrGroups = (
    quantitiesCopy.filter(isOrGroup) as FlatOrGroup<QuantityWithExtendedUnit>[]
  ).filter((q) => q.quantities.length > 1);

  const unitLists: QuantityWithUnitDef[][] = [];
  for (const orGroup of OrGroups) {
    // Normalize units, transfer integerProtected tag, and add name to it when no unit
    const orGroupModified = {
      ...orGroup,
      quantities: orGroup.quantities.map((q) => {
        if (isQuantity(q)) {
          const integerProtected = q.unit?.integerProtected;
          q.unit = getNormalizedUnit(q.unit?.name);
          if (integerProtected) {
            q.unit.integerProtected = true;
          }
        }
        return q as QuantityWithUnitDef;
      }),
    };
    // Is the unit already listed in an equivalent group?
    const units = orGroupModified.quantities.map((q) => q.unit);
    // Is the quantity already represented in one of the existing unit lists?
    const linkIndex = unitLists.findIndex((l) => {
      const listItem = l.map((q) => getNormalizedUnit(q.unit?.name));
      return units.some((u) =>
        listItem.some(
          (lu) =>
            lu.name === u.name ||
            (lu.system === u.system &&
              lu.type === u.type &&
              lu.type !== "other"),
        ),
      );
    });
    if (linkIndex === -1) {
      // We populate a new group with the entire group of quantities of the provided OR group
      unitLists.push(orGroupModified.quantities);
    } else {
      let unitRatio: Big | undefined;
      const commonUnitList = unitLists[linkIndex]!.reduce((acc, v) => {
        const normalizedV: QuantityWithUnitDef = {
          ...v,
          unit: getNormalizedUnit(v.unit?.name),
        };
        if (v.unit?.integerProtected) normalizedV.unit.integerProtected = true;

        const commonQuantity = orGroupModified.quantities.find(
          (q) => isQuantity(q) && areUnitsCompatible(q.unit, normalizedV.unit),
        );
        if (commonQuantity) {
          acc.push(normalizedV);
          unitRatio = getUnitRatio(normalizedV, commonQuantity);
        }
        return acc;
      }, [] as QuantityWithUnitDef[]);
      for (const newQ of orGroupModified.quantities) {
        if (commonUnitList.some((q) => areUnitsCompatible(q.unit, newQ.unit))) {
          continue;
        } else {
          newQ.quantity = multiplyQuantityValue(newQ.quantity, unitRatio!);
          unitLists[linkIndex]!.push(newQ);
        }
      }
    }
  }

  return unitLists;
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

function findListWithCompatibleQuantity(
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

export function reduceOrsToFirstEquivalent(
  unitList: QuantityWithUnitDef[][],
  quantities: (
    | QuantityWithExtendedUnit
    | FlatOrGroup<QuantityWithExtendedUnit>
  )[],
): QuantityWithExtendedUnit[] {
  function reduceToQuantity(firstQuantity: QuantityWithExtendedUnit) {
    // Look for the global list of equivalent for this quantity unit;
    const equivalentList = sortUnitList(
      findListWithCompatibleQuantity(unitList, firstQuantity)!,
    );
    if (!equivalentList) return firstQuantity;
    // Find that first quantity in the OR
    const firstQuantityInList = findCompatibleQuantityWithinList(
      equivalentList,
      firstQuantity,
    )!;
    // Normalize the first quantity's unit
    const normalizedFirstQuantity: QuantityWithUnitDef = {
      ...firstQuantity,
      unit: getNormalizedUnit(firstQuantity.unit?.name),
    };
    // Priority 1: the first quantity has an integer-protected unit
    if (firstQuantityInList.unit.integerProtected) {
      const resultQuantity: QuantityWithExtendedUnit = {
        quantity: firstQuantity.quantity,
      };
      if (normalizedFirstQuantity.unit.name !== "__no-unit__") {
        resultQuantity.unit = { name: normalizedFirstQuantity.unit.name };
      }
      return resultQuantity;
    } else {
      // Priority 2: the next integer-protected units in the equivalent list
      let nextProtected: number | undefined;
      const equivalentListTemp = [...equivalentList];
      while (nextProtected !== -1) {
        nextProtected = equivalentListTemp.findIndex(
          (eq) => eq.unit?.integerProtected,
        );
        // Ratio between the values in the OR group vs the ones used in the equivalent unit list
        if (nextProtected !== -1) {
          const unitRatio = getUnitRatio(
            equivalentListTemp[nextProtected]!,
            firstQuantityInList,
          );
          const nextProtectedQuantityValue = multiplyQuantityValue(
            firstQuantity.quantity,
            unitRatio,
          );
          if (isValueIntegerLike(nextProtectedQuantityValue)) {
            const nextProtectedQuantity: QuantityWithExtendedUnit = {
              quantity: nextProtectedQuantityValue,
            };
            if (
              equivalentListTemp[nextProtected]!.unit.name !== "__no-unit__"
            ) {
              nextProtectedQuantity.unit = {
                name: equivalentListTemp[nextProtected]!.unit.name,
              };
            }

            return nextProtectedQuantity;
          } else {
            equivalentListTemp.splice(nextProtected, 1);
          }
        }
      }

      // Priority 3: the first non-integer-Protected value of the list
      const firstNonIntegerProtected = equivalentListTemp.filter(
        (q) => !q.unit.integerProtected,
      )[0]!;
      // Example: with unitsList = [10 mL, 1 large] and input FirstQuantity = 0.5 large
      // value in target unit = value of input * target-in-list/input-in-list * 1 large / 1 large
      //       5 (mL)     =        0.5 (large) *           10 / 1
      // Example: with unitsList = [1 large, 10 mL] and input FirstQuantity = 2 cL
      // value in target unit = value of input * target-in-list/input-in-list * 1 cL / 1 mL
      //       2 large    =          2 large      *           1 / 10               10 / 1'
      // Example: with unitsList = [10 mL, 1 large] and input FirstQuantity = 2 cL
      // value in target unit = value of input * target-in-list/input-in-list * 1 cL / 1 mL
      //       20 mL      =          2 large      *           1 / 10               10 / 1
      const unitRatio = getUnitRatio(
        firstNonIntegerProtected,
        firstQuantityInList,
      ).times(getBaseUnitRatio(normalizedFirstQuantity, firstQuantityInList));
      const firstEqQuantity: QuantityWithExtendedUnit = {
        quantity:
          firstNonIntegerProtected.unit.name === firstQuantity.unit!.name
            ? firstQuantity.quantity
            : multiplyQuantityValue(firstQuantity.quantity, unitRatio),
      };
      if (firstNonIntegerProtected.unit.name !== "__no-unit__") {
        firstEqQuantity.unit = { name: firstNonIntegerProtected.unit.name };
      }
      return firstEqQuantity;
    }
  }
  return quantities.map((q) => {
    if (isQuantity(q)) return reduceToQuantity(q);
    // Now, q is necessarily an OR group
    // We normalize units and sort them to get integerProtected elements first, then no units, then the rest
    const qListModified = sortUnitList(
      q.quantities.map((qq) => {
        const integerProtected = qq.unit?.integerProtected;
        qq.unit = getNormalizedUnit(qq.unit?.name);
        if (integerProtected) {
          qq.unit.integerProtected = true;
        }
        return qq as QuantityWithUnitDef;
      }),
    );
    // We can simply use the first element
    return reduceToQuantity(qListModified[0]!);
  });
}

export function addQuantitiesOrGroups(
  ...quantities: (
    | QuantityWithExtendedUnit
    | FlatOrGroup<QuantityWithExtendedUnit>
  )[]
): {
  sum: QuantityWithUnitDef | FlatGroup<QuantityWithUnitDef>;
  unitsLists: QuantityWithUnitDef[][];
} {
  if (quantities.length === 0)
    return {
      sum: {
        quantity: getDefaultQuantityValue(),
        unit: getNormalizedUnit("__no-unit__"),
      },
      unitsLists: [],
    };
  if (quantities.length === 1) {
    if (isQuantity(quantities[0]!))
      return {
        sum: {
          ...quantities[0],
          unit: getNormalizedUnit(quantities[0].unit?.name),
        },
        unitsLists: [],
      };
  }
  // Step 1: find equivalents units
  const unitsLists = getEquivalentUnitsLists(...quantities);
  // Step 2: reduce the OR group to Quantities
  const reducedQuantities = reduceOrsToFirstEquivalent(unitsLists, quantities);
  // Step 3: calculate the sum
  const sum: QuantityWithUnitDef[] = [];
  for (const nextQ of reducedQuantities) {
    const existingQ = findCompatibleQuantityWithinList(sum, nextQ);
    if (existingQ === undefined) {
      sum.push({
        ...nextQ,
        unit: getNormalizedUnit(nextQ.unit?.name),
      });
    } else {
      const sumQ = addQuantities(existingQ, nextQ);
      existingQ.quantity = sumQ.quantity;
      existingQ.unit = getNormalizedUnit(sumQ.unit?.name);
    }
  }
  if (sum.length === 1) {
    return { sum: sum[0]!, unitsLists };
  }
  return { sum: { type: "and", quantities: sum }, unitsLists };
}

function regroupQuantitiesAndExpandEquivalents(
  sum: QuantityWithUnitDef | FlatGroup<QuantityWithUnitDef>,
  unitsLists: QuantityWithUnitDef[][],
): (QuantityWithExtendedUnit | MaybeNestedOrGroup<QuantityWithExtendedUnit>)[] {
  const sumQuantities = isGroup(sum) ? sum.quantities : [sum];
  const result: (
    | QuantityWithExtendedUnit
    | MaybeNestedOrGroup<QuantityWithExtendedUnit>
  )[] = [];
  const processedQuantities = new Set<QuantityWithUnitDef>();

  for (const list of unitsLists) {
    const listCopy = [...list];
    const main: QuantityWithUnitDef[] = [];
    const mainCandidates = sumQuantities.filter(
      (q) => !processedQuantities.has(q),
    );

    if (mainCandidates.length === 0) continue;

    mainCandidates.forEach((q) => {
      // If the sum contain a value from the unit list, we push it to the mains and remove it from the list
      const mainInList = findCompatibleQuantityWithinList(listCopy, q);
      if (mainInList !== undefined) {
        processedQuantities.add(q);
        main.push(q);
        listCopy.splice(listCopy.indexOf(mainInList), 1);
      }
    });

    // We sort the equivalent units and calculate the equivalent value for each of them
    const equivalents = sortUnitList(listCopy).map((equiv) => {
      const initialValue: QuantityWithExtendedUnit = {
        quantity: getDefaultQuantityValue(),
      };
      if (equiv.unit) {
        initialValue.unit = { name: equiv.unit.name };
      }
      return main.reduce((acc, v) => {
        const mainInList = findCompatibleQuantityWithinList(list, v)!;
        const newValue: QuantityWithExtendedUnit = {
          quantity: multiplyQuantityValue(
            v.quantity,
            Big(getAverageValue(equiv.quantity)).div(
              getAverageValue(mainInList.quantity),
            ),
          ),
        };
        if (equiv.unit && equiv.unit.name !== "__no-unit__") {
          newValue.unit = { name: equiv.unit.name };
        }
        return addQuantities(acc, newValue);
      }, initialValue);
    });

    if (main.length + equivalents.length > 1) {
      const resultMain:
        | QuantityWithExtendedUnit
        | FlatAndGroup<QuantityWithExtendedUnit> =
        main.length > 1
          ? {
              type: "and",
              quantities: main.map(deNormalizeQuantity),
            }
          : deNormalizeQuantity(main[0]!);
      result.push({
        type: "or",
        quantities: [resultMain, ...equivalents],
      });
    } else {
      result.push(deNormalizeQuantity(main[0]!));
    }
  }

  // We add at the end the lone quantities
  sumQuantities
    .filter((q) => !processedQuantities.has(q))
    .forEach((q) => result.push(deNormalizeQuantity(q)));

  return result;
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

export function addEquivalentsAndSimplify(
  ...quantities: (
    | QuantityWithExtendedUnit
    | FlatOrGroup<QuantityWithExtendedUnit>
  )[]
): QuantityWithPlainUnit | MaybeNestedGroup<QuantityWithPlainUnit> {
  if (quantities.length === 1) {
    return toPlainUnit(quantities[0]!);
  }
  // Step 1+2+3: find equivalents, reduce groups and add quantities
  const { sum, unitsLists } = addQuantitiesOrGroups(...quantities);
  // Step 4: regroup and expand equivalents per group
  const regrouped = regroupQuantitiesAndExpandEquivalents(sum, unitsLists);
  if (regrouped.length === 1) {
    return toPlainUnit(regrouped[0]!);
  } else {
    return { type: "and", quantities: regrouped.map(toPlainUnit) };
  }
}
