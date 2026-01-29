import type {
  FixedValue,
  Range,
  DecimalValue,
  FractionValue,
  Unit,
  UnitDefinition,
  QuantityWithPlainUnit,
  QuantityWithExtendedUnit,
  QuantityWithUnitDef,
  MaybeNestedGroup,
  MaybeNestedAndGroup,
  SpecificUnitSystem,
} from "../types";
import { normalizeUnit, resolveUnit, isNoUnit } from "../units/definitions";
import { getToBase, findBestUnit } from "../units/conversion";
import { areUnitsConvertible } from "../units/compatibility";
import {
  addNumericValues,
  getNumericValue,
  formatOutputValue,
  getAverageValue,
} from "./numeric";
import { CannotAddTextValueError, IncompatibleUnitsError } from "../errors";
import { isAndGroup, isOrGroup, isQuantity } from "../utils/type_guards";

// `deNormalizeQuantity` is provided by `./math` and re-exported below.

export function extendAllUnits(
  q: QuantityWithPlainUnit | MaybeNestedGroup<QuantityWithPlainUnit>,
): QuantityWithExtendedUnit | MaybeNestedGroup<QuantityWithExtendedUnit> {
  if (isAndGroup(q)) {
    return { and: q.and.map(extendAllUnits) };
  } else if (isOrGroup(q)) {
    return { or: q.or.map(extendAllUnits) };
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
  if (isAndGroup(q)) {
    return { and: q.and.map(normalizeAllUnits) };
  } else if (isOrGroup(q)) {
    return { or: q.or.map(normalizeAllUnits) };
  } else {
    const newQ: QuantityWithUnitDef = {
      quantity: q.quantity,
      unit: resolveUnit(q.unit),
    };
    // If the quantity has equivalents, convert them to an OR group
    if (q.equivalents && q.equivalents.length > 0) {
      const equivalentsNormalized = q.equivalents.map((eq) =>
        normalizeAllUnits(eq),
      );
      return {
        or: [newQ, ...equivalentsNormalized] as QuantityWithUnitDef[],
      };
    }
    return newQ;
  }
}

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
 *
 * The "best unit" is selected based on:
 * 1. Filter candidates to units where `isBestUnit !== false`
 * 2. Use per-unit `maxValue` thresholds (prefer largest unit where value ≥ 1 and ≤ maxValue)
 * 3. Prefer integers in input unit family
 * 4. Prefer integers in any unit family
 * 5. If no integers, prefer smallest value in range
 *
 * @param q1 - The first quantity
 * @param q2 - The second quantity
 * @param system - Optional system context for resolving ambiguous units
 * @returns The sum of the two quantities
 */
export function addQuantities(
  q1: QuantityWithExtendedUnit,
  q2: QuantityWithExtendedUnit,
  system?: SpecificUnitSystem,
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

  // Case 3: the two quantities have the exact same unit (or both no unit)
  if (!q1.unit && !q2.unit) {
    return addQuantityValuesAndSetUnit(v1, v2, q1.unit);
  }
  if (
    q1.unit &&
    q2.unit &&
    q1.unit.name.toLowerCase() === q2.unit.name.toLowerCase()
  ) {
    // Same unit - check if we should upgrade to a larger unit (e.g., 1200g → 1.2kg)
    if (unit1Def) {
      // Known unit type - use findBestUnit to potentially upgrade
      const effectiveSystem =
        system ??
        (["metric", "JP"].includes(unit1Def.system)
          ? (unit1Def.system as "metric" | "JP")
          : "US");
      return addAndFindBestUnit(v1, v2, unit1Def, unit1Def, effectiveSystem, [
        unit1Def,
      ]);
    }
    // Unknown unit type - just add values, keep unit
    return addQuantityValuesAndSetUnit(v1, v2, q1.unit);
  }

  // Case 4: the two quantities have different units of known type
  if (unit1Def && unit2Def) {
    // Throw error if units aren't convertible (not of same type)
    if (!areUnitsConvertible(unit1Def, unit2Def)) {
      throw new IncompatibleUnitsError(
        `${unit1Def.type} (${q1.unit?.name})`,
        `${unit2Def.type} (${q2.unit?.name})`,
      );
    }

    // Determine the effective system for conversion of ambiguous units
    let effectiveSystem = system;

    // If no system provided, infer based on the input units:
    // 1. Prefer metric if either unit is metric
    // 2. If both are ambiguous and US-compatible, use US
    // 3. Default to metric
    // v8 ignore else -- @preserve
    if (!effectiveSystem) {
      if (unit1Def.system === "metric" || unit2Def.system === "metric") {
        effectiveSystem = "metric";
      } else {
        // TODO remove if v8 marker if JP is augmented with more than one unit */
        // v8 ignore if -- @preserve
        if (unit1Def.system === "JP" && unit2Def.system === "JP") {
          effectiveSystem = "JP";
        } else {
          // Check if both units are US-compatible
          const unit1SupportsUS =
            unit1Def.system === "US" ||
            (unit1Def.system === "ambiguous" &&
              unit1Def.toBaseBySystem &&
              "US" in unit1Def.toBaseBySystem);
          const unit2SupportsUS =
            unit2Def.system === "US" ||
            (unit2Def.system === "ambiguous" &&
              unit2Def.toBaseBySystem &&
              "US" in unit2Def.toBaseBySystem);
          effectiveSystem =
            unit1SupportsUS && unit2SupportsUS ? "US" : "metric";
        }
      }
    }

    return addAndFindBestUnit(v1, v2, unit1Def, unit2Def, effectiveSystem, [
      unit1Def,
      unit2Def,
    ]);
  }

  // Case 5: the two quantities have different units of unknown type
  throw new IncompatibleUnitsError(
    q1.unit?.name as string,
    q2.unit?.name as string,
  );
}

/**
 * Helper function to add two quantities and find the best unit for the result.
 */
function addAndFindBestUnit(
  v1: FixedValue | Range,
  v2: FixedValue | Range,
  unit1Def: UnitDefinition,
  unit2Def: UnitDefinition,
  system: SpecificUnitSystem,
  inputUnits: UnitDefinition[],
): QuantityWithExtendedUnit {
  // Convert both values to base units and sum
  const toBase1 = getToBase(unit1Def, system);
  const toBase2 = getToBase(unit2Def, system);

  // Get the sum in base units
  let sumInBase: number;
  if (v1.type === "fixed" && v2.type === "fixed") {
    const val1 = getNumericValue(v1.value as DecimalValue | FractionValue);
    const val2 = getNumericValue(v2.value as DecimalValue | FractionValue);
    sumInBase = val1 * toBase1 + val2 * toBase2;
  } else {
    // Handle ranges by using average for best unit selection
    const avg1 = getAverageValue(v1) as number;
    const avg2 = getAverageValue(v2) as number;
    sumInBase = avg1 * toBase1 + avg2 * toBase2;
  }

  // Find the best unit
  const { unit: bestUnit, value: bestValue } = findBestUnit(
    sumInBase,
    unit1Def.type,
    system,
    inputUnits,
  );

  // Format the value (uses fractions if unit supports them)
  const formattedValue = formatOutputValue(bestValue, bestUnit);

  // Handle ranges: scale the range to the best unit
  if (v1.type === "range" || v2.type === "range") {
    const r1 =
      v1.type === "range"
        ? v1
        : { type: "range" as const, min: v1.value, max: v1.value };
    const r2 =
      v2.type === "range"
        ? v2
        : { type: "range" as const, min: v2.value, max: v2.value };

    const minInBase =
      getNumericValue(r1.min as DecimalValue | FractionValue) * toBase1 +
      getNumericValue(r2.min as DecimalValue | FractionValue) * toBase2;
    const maxInBase =
      getNumericValue(r1.max as DecimalValue | FractionValue) * toBase1 +
      getNumericValue(r2.max as DecimalValue | FractionValue) * toBase2;

    const bestToBase = getToBase(bestUnit, system);
    const minValue = minInBase / bestToBase;
    const maxValue = maxInBase / bestToBase;

    return {
      quantity: {
        type: "range",
        min: formatOutputValue(minValue, bestUnit),
        max: formatOutputValue(maxValue, bestUnit),
      },
      unit: { name: bestUnit.name },
    };
  }

  return {
    quantity: { type: "fixed", value: formattedValue },
    unit: { name: bestUnit.name },
  };
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
  else if (isOrGroup(quantity)) {
    return {
      or: quantity.or.map(toPlainUnit),
    } as MaybeNestedGroup<QuantityWithPlainUnit>;
  } else {
    return {
      and: quantity.and.map(toPlainUnit),
    } as MaybeNestedGroup<QuantityWithPlainUnit>;
  }
}

// Convert plain unit to extended unit format for addEquivalentsAndSimplify
// Overloads for precise return types
export function toExtendedUnit(
  q: QuantityWithPlainUnit,
): QuantityWithExtendedUnit;
export function toExtendedUnit(
  q: MaybeNestedGroup<QuantityWithPlainUnit>,
): MaybeNestedGroup<QuantityWithExtendedUnit>;
export function toExtendedUnit(
  q: QuantityWithPlainUnit | MaybeNestedGroup<QuantityWithPlainUnit>,
): QuantityWithExtendedUnit | MaybeNestedGroup<QuantityWithExtendedUnit>;
export function toExtendedUnit(
  q: QuantityWithPlainUnit | MaybeNestedGroup<QuantityWithPlainUnit>,
): QuantityWithExtendedUnit | MaybeNestedGroup<QuantityWithExtendedUnit> {
  if (isQuantity(q)) {
    return q.unit
      ? { ...q, unit: { name: q.unit } }
      : (q as QuantityWithExtendedUnit);
  } else if (isOrGroup(q)) {
    return { or: q.or.map(toExtendedUnit) };
  } else {
    return { and: q.and.map(toExtendedUnit) };
  }
}

export function deNormalizeQuantity(
  q: QuantityWithUnitDef,
): QuantityWithExtendedUnit {
  const result: QuantityWithExtendedUnit = {
    quantity: q.quantity,
  };
  if (!isNoUnit(q.unit)) {
    result.unit = { name: q.unit.name };
  }
  return result;
}

// Helper function to convert addEquivalentsAndSimplify result to Ingredient.quantities format
// Returns either a QuantityWithPlainUnit (for simple/OR groups) or an IngredientQuantityAndGroup (for AND groups)
export const flattenPlainUnitGroup = (
  summed: QuantityWithPlainUnit | MaybeNestedGroup<QuantityWithPlainUnit>,
): (
  | QuantityWithPlainUnit
  | {
      and: QuantityWithPlainUnit[];
      equivalents?: QuantityWithPlainUnit[];
    }
)[] => {
  if (isOrGroup(summed)) {
    // OR group: check if first entry is an AND group (nested OR-with-AND case from addEquivalentsAndSimplify)
    // This happens when we have incompatible integer-protected primaries with compatible equivalents
    // e.g., { or: [{ and: [large, small] }, cup] }
    const entries = summed.or;
    const andGroupEntry = entries.find(
      (e): e is MaybeNestedGroup<QuantityWithPlainUnit> => isAndGroup(e),
    );

    if (andGroupEntry) {
      // Nested OR-with-AND case: AND group of primaries + equivalents
      const andEntries: QuantityWithPlainUnit[] = [];
      // Double casting due to:
      // - Nested ORs are flattened already
      // - Double nesting is not possible in this context
      const addGroupEntryContent = (
        andGroupEntry as MaybeNestedAndGroup<QuantityWithPlainUnit>
      ).and as QuantityWithPlainUnit[];
      for (const entry of addGroupEntryContent) {
        andEntries.push({
          quantity: entry.quantity,
          ...(entry.unit && { unit: entry.unit }),
        });
      }

      // The other entries in the OR group are the equivalents
      const equivalentsList: QuantityWithPlainUnit[] = entries
        .filter((e): e is QuantityWithPlainUnit => isQuantity(e))
        .map((e) => ({ quantity: e.quantity, unit: e.unit }));

      if (equivalentsList.length > 0) {
        return [
          {
            and: andEntries,
            equivalents: equivalentsList,
          },
        ];
      } else {
        // No equivalents: flatten to separate entries (shouldn't happen in this branch, but handle it)
        return andEntries;
      }
    }

    // Simple OR group: first entry is primary, rest are equivalents
    const simpleEntries = entries.filter((e): e is QuantityWithPlainUnit =>
      isQuantity(e),
    );
    /* v8 ignore else -- @preserve */
    if (simpleEntries.length > 0) {
      const result: QuantityWithPlainUnit = {
        quantity: simpleEntries[0]!.quantity,
        unit: simpleEntries[0]!.unit,
      };
      if (simpleEntries.length > 1) {
        result.equivalents = simpleEntries.slice(1);
      }
      return [result];
    }
    // Fallback: use first entry regardless
    else {
      const first = entries[0] as QuantityWithPlainUnit;
      return [{ quantity: first.quantity, unit: first.unit }];
    }
  } else if (isAndGroup(summed)) {
    // AND group: check if entries have OR groups (equivalents that can be extracted)
    const andEntries: QuantityWithPlainUnit[] = [];
    const equivalentsList: QuantityWithPlainUnit[] = [];
    for (const entry of summed.and) {
      // Double-nesting is not possible in this context
      // v8 ignore else -- @preserve
      if (isOrGroup(entry)) {
        // This entry has equivalents: first is primary, rest are equivalents
        const orEntries = entry.or as QuantityWithPlainUnit[];
        andEntries.push({
          quantity: orEntries[0]!.quantity,
          ...(orEntries[0]!.unit && { unit: orEntries[0]!.unit }),
        });
        // Collect equivalents for later merging
        equivalentsList.push(...orEntries.slice(1));
      } else if (isQuantity(entry)) {
        // Simple quantity, no equivalents
        andEntries.push({
          quantity: entry.quantity,
          ...(entry.unit && { unit: entry.unit }),
        });
      }
    }

    // Build the AND group result
    // If there are no equivalents, flatten to separate groupQuantity entries (water case)
    // If there are equivalents, return an AND group with the summed equivalents (carrots case)
    if (equivalentsList.length === 0) {
      // No equivalents: flatten to separate entries
      return andEntries;
    }

    const result: {
      and: QuantityWithPlainUnit[];
      equivalents?: QuantityWithPlainUnit[];
    } = {
      and: andEntries,
      equivalents: equivalentsList,
    };

    return [result];
  } else {
    // Simple QuantityWithPlainUnit
    return [
      { quantity: summed.quantity, ...(summed.unit && { unit: summed.unit }) },
    ];
  }
};

/**
 * Apply the best unit to a quantity based on its value and unit system.
 * Converts the quantity to base units, finds the best unit for display,
 * and returns a new quantity with the best unit.
 *
 * @param q - The quantity to optimize
 * @param system - The unit system to use for finding the best unit. If not provided,
 *                 the system is inferred from the unit (metric/JP stay as-is, others default to US).
 * @returns A new quantity with the best unit, or the original if no conversion possible
 */
export function applyBestUnit(
  q: QuantityWithExtendedUnit,
  system?: SpecificUnitSystem,
): QuantityWithExtendedUnit {
  // Skip if no unit or text value
  if (!q.unit?.name) {
    return q;
  }

  const unitDef = resolveUnit(q.unit.name);

  // Skip if unit type is "other" (not convertible)
  if (unitDef.type === "other") {
    return q;
  }

  // Get the value - skip if text
  if (q.quantity.type === "fixed" && q.quantity.value.type === "text") {
    return q;
  }

  const avgValue = getAverageValue(q.quantity);
  if (typeof avgValue !== "number") {
    return q;
  }

  // Determine effective system: use provided system, or infer from unit
  const effectiveSystem: SpecificUnitSystem =
    system ??
    (["metric", "JP"].includes(unitDef.system)
      ? (unitDef.system as "metric" | "JP")
      : "US");

  // Convert to base units
  const toBase = getToBase(unitDef, effectiveSystem);
  const valueInBase = avgValue * toBase;

  // Find the best unit
  const { unit: bestUnit, value: bestValue } = findBestUnit(
    valueInBase,
    unitDef.type,
    effectiveSystem,
    [unitDef],
  );

  // Get canonical name of the original unit for comparison
  const originalCanonicalName = normalizeUnit(q.unit.name)?.name ?? q.unit.name;

  // If same unit (by canonical name match), no change needed - preserve original unit name
  if (bestUnit.name === originalCanonicalName) {
    return q;
  }

  // Format the value for the best unit
  const formattedValue = formatOutputValue(bestValue, bestUnit);

  // Handle ranges: scale to the best unit
  if (q.quantity.type === "range") {
    const bestToBase = getToBase(bestUnit, effectiveSystem);
    const minValue =
      (getNumericValue(q.quantity.min) * toBase) / bestToBase;
    const maxValue =
      (getNumericValue(q.quantity.max) * toBase) / bestToBase;

    return {
      quantity: {
        type: "range",
        min: formatOutputValue(minValue, bestUnit),
        max: formatOutputValue(maxValue, bestUnit),
      },
      unit: { name: bestUnit.name },
    };
  }

  // Fixed value
  return {
    quantity: {
      type: "fixed",
      value: formattedValue,
    },
    unit: { name: bestUnit.name },
  };
}
