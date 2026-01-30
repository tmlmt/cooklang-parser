import Big from "big.js";
import type { QuantityWithUnitDef } from "../types";
import {
  getAverageValue,
  approximateFraction,
  DEFAULT_DENOMINATORS,
  DEFAULT_FRACTION_ACCURACY,
  DEFAULT_MAX_WHOLE,
} from "../quantities/numeric";
import { UnitDefinition, SpecificUnitSystem, UnitType } from "../types";
import { isUnitCompatibleWithSystem } from "./compatibility";
import { units } from "./definitions";

const EPSILON = 0.01;
const DEFAULT_MAX_VALUE = 999;

/**
 * Check if a value is "close enough" to an integer (within epsilon).
 */
function isCloseToInteger(value: number): boolean {
  return Math.abs(value - Math.round(value)) < EPSILON;
}

/**
 * Get the maximum value threshold for a unit.
 * Beyond this value, we should upgrade to a larger unit.
 */
function getMaxValue(unit: UnitDefinition): number {
  return unit.maxValue ?? DEFAULT_MAX_VALUE;
}

/**
 * Check if a value is in the valid range for a unit.
 * A value is valid if:
 * - It's \>= 1 AND \<= maxValue, OR
 * - It's \< 1 AND can be approximated as a fraction (for units with fractions enabled)
 */
function isValueInRange(value: number, unit: UnitDefinition): boolean {
  const maxValue = getMaxValue(unit);

  // Standard range: 1 to maxValue
  if (value >= 1 && value <= maxValue) {
    return true;
  }

  // Fraction range: values < 1 that can be approximated as fractions
  if (value > 0 && value < 1 && unit.fractions?.enabled) {
    const denominators = unit.fractions.denominators ?? DEFAULT_DENOMINATORS;
    const maxWhole = unit.fractions.maxWhole ?? DEFAULT_MAX_WHOLE;
    const fraction = approximateFraction(
      value,
      denominators,
      DEFAULT_FRACTION_ACCURACY,
      maxWhole,
    );
    return fraction !== null;
  }

  return false;
}

/**
 * Find the best unit for displaying a quantity.
 *
 * Algorithm:
 * 1. Get all candidate units of the same type that are compatible with the system
 * 2. Filter to candidates where value \>= 1 and value \<= maxValue (per-unit threshold)
 * 3. Only consider units with isBestUnit !== false
 * 4. Score: prefer integers in input family → integers in any family → smallest in range
 * 5. If none in range, pick the one closest to the range
 *
 * @param valueInBase - The value in base units (e.g., grams for mass, mL for volume)
 * @param unitType - The type of unit (mass, volume, count)
 * @param system - The system to use for conversion (metric, US, UK, JP)
 * @param inputUnits - The original input units (used as preferred "family")
 * @returns The best unit definition and the converted value
 */
export function findBestUnit(
  valueInBase: number,
  unitType: UnitType,
  system: SpecificUnitSystem,
  inputUnits: UnitDefinition[],
): { unit: UnitDefinition; value: number } {
  const inputUnitNames = new Set(inputUnits.map((u) => u.name));
  // Get all candidate units of the same type compatible with the system, including input units
  const candidates = units.filter(
    (u) =>
      u.type === unitType &&
      isUnitCompatibleWithSystem(u, system) &&
      (u.isBestUnit !== false || inputUnitNames.has(u.name)),
  );

  /* v8 ignore start -- @preserve: defensive fallback that shouldn't happen with valid inputs */
  if (candidates.length === 0) {
    // Fallback: shouldn't happen, but return first input unit
    const fallbackUnit = inputUnits[0]!;
    return {
      unit: fallbackUnit,
      value: valueInBase / getToBase(fallbackUnit, system),
    };
  }
  /* v8 ignore stop */

  // Calculate value for each candidate
  const candidatesWithValues = candidates.map((unit) => ({
    unit,
    value: valueInBase / getToBase(unit, system),
  }));

  // Filter to valid range (including fraction-representable values), only for best-unit candidates
  const inRange = candidatesWithValues.filter((c) =>
    isValueInRange(c.value, c.unit),
  );

  if (inRange.length > 0) {
    // First priority: integers in input family
    const integersInInputFamily = inRange.filter(
      (c) => isCloseToInteger(c.value) && inputUnitNames.has(c.unit.name),
    );
    if (integersInInputFamily.length > 0) {
      // Return smallest integer in input family
      return integersInInputFamily.sort((a, b) => a.value - b.value)[0]!;
    }

    // Second priority: integers in any family (prefer system-appropriate units)
    const integersAny = inRange.filter((c) => isCloseToInteger(c.value));
    if (integersAny.length > 0) {
      // Sort by value
      return integersAny.sort((a, b) => a.value - b.value)[0]!;
    }

    // Third priority: smallest value in range (prioritizing input family)
    return inRange.sort((a, b) => {
      // Prioritize input family
      const aInFamily = inputUnitNames.has(a.unit.name) ? 0 : 1;
      const bInFamily = inputUnitNames.has(b.unit.name) ? 0 : 1;
      if (aInFamily !== bInFamily) return aInFamily - bInFamily;
      // Then by smallest value
      return a.value - b.value;
    })[0]!;
  }

  return candidatesWithValues.sort((a, b) => {
    const aMaxValue = getMaxValue(a.unit);
    const bMaxValue = getMaxValue(b.unit);
    const aDistance = a.value < 1 ? 1 - a.value : a.value - aMaxValue;
    const bDistance = b.value < 1 ? 1 - b.value : b.value - bMaxValue;
    return aDistance - bDistance;
  })[0]!;
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

/**
 * Get the toBase conversion factor for a unit, considering the system context.
 *
 * For ambiguous units:
 * - If a specific system is provided and the unit supports it, use that system's factor
 * - Otherwise, fall back to the unit's default toBase
 *
 * @param unit - The unit definition
 * @param system - Optional system context to use for ambiguous units
 * @returns The appropriate toBase conversion factor
 */
export function getToBase(
  unit: UnitDefinition,
  system?: SpecificUnitSystem,
): number {
  if (unit.system === "ambiguous" && system && unit.toBaseBySystem) {
    return unit.toBaseBySystem[system] ?? unit.toBase;
  }
  return unit.toBase;
}
