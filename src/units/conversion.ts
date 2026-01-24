import Big from "big.js";
import type { QuantityWithUnitDef } from "../types";
import { getAverageValue } from "../quantities/numeric";
import { UnitDefinition, SpecificUnitSystem } from "../types";

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
