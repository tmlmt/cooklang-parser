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
import {
  units,
  normalizeUnit,
  resolveUnit,
  isNoUnit,
} from "../units/definitions";
import { getToBase } from "../units/conversion";
import { areUnitsConvertible } from "../units/compatibility";
import { addNumericValues, multiplyQuantityValue } from "./numeric";
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
 * Convert a quantity value from one unit to another.
 *
 * @param value - The quantity value to convert
 * @param def - The source unit definition
 * @param targetDef - The target unit definition
 * @param system - Optional system context for resolving ambiguous units
 * @returns The converted quantity value
 */
export const convertQuantityValue = (
  value: FixedValue | Range,
  def: UnitDefinition,
  targetDef: UnitDefinition,
  system?: SpecificUnitSystem,
): FixedValue | Range => {
  if (def.name === targetDef.name) return value;

  const sourceToBase = getToBase(def, system);
  const targetToBase = getToBase(targetDef, system);
  const factor = sourceToBase / targetToBase;

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
    // Throw error if units aren't convertible (not of same type)
    if (!areUnitsConvertible(unit1Def, unit2Def)) {
      throw new IncompatibleUnitsError(
        `${unit1Def.type} (${q1.unit?.name})`,
        `${unit2Def.type} (${q2.unit?.name})`,
      );
    }

    // Determine the effective system for conversion of ambiguous units
    let effectiveSystem = system;

    // If no system provided, try to infer from non-ambiguous unit
    // v8 ignore else -- @preserve
    if (!effectiveSystem) {
      if (unit1Def.system !== "ambiguous") {
        effectiveSystem = unit1Def.system;
      } else if (unit2Def.system !== "ambiguous") {
        effectiveSystem = unit2Def.system;
      }
      // If both are ambiguous, effectiveSystem remains undefined and we use defaults
    }

    let targetUnitDef: UnitDefinition;
    let conversionSystem: SpecificUnitSystem | undefined;

    // Resolve effective systems for each unit
    const sys1 =
      unit1Def.system === "ambiguous"
        ? unit1Def.toBaseBySystem?.[effectiveSystem!] !== undefined
          ? effectiveSystem
          : undefined
        : unit1Def.system;

    const sys2 =
      unit2Def.system === "ambiguous"
        ? unit2Def.toBaseBySystem?.[effectiveSystem!] !== undefined
          ? effectiveSystem
          : undefined
        : unit2Def.system;

    if (sys1 === sys2 && sys1 !== undefined) {
      // Case 4.1: Same system - use larger unit of that system
      const toBase1 = getToBase(unit1Def, sys1);
      const toBase2 = getToBase(unit2Def, sys1);
      targetUnitDef = toBase1 >= toBase2 ? unit1Def : unit2Def;
      conversionSystem = sys1;
    } else if (system !== undefined) {
      // Case 4.2: Context system is set - use the unit that supports it (or larger if both do)
      const unit1SupportsSystem =
        unit1Def.system === system ||
        (unit1Def.system === "ambiguous" &&
          unit1Def.toBaseBySystem?.[system] !== undefined);

      targetUnitDef = unit1SupportsSystem ? unit1Def : unit2Def;
      conversionSystem = system;
    } else if (sys1 === "metric" || sys2 === "metric") {
      // Case 4.3: No context system, but one unit is metric - use that metric unit
      targetUnitDef = sys1 === "metric" ? unit1Def : unit2Def;
      conversionSystem = "metric";
    } else if (sys1 === undefined && sys2 === undefined) {
      // Case 4.4: Both units are ambiguous with no context - default to US, use larger unit
      const toBase1 = getToBase(unit1Def, "US");
      const toBase2 = getToBase(unit2Def, "US");
      targetUnitDef = toBase1 >= toBase2 ? unit1Def : unit2Def;
      conversionSystem = "US";
    } else {
      // Case 4.5: Different non-metric systems (e.g., JP + US/UK) - convert to metric
      const metricUnits = units.filter(
        (u) => u.type === unit1Def.type && u.system === "metric",
      );
      targetUnitDef = metricUnits[metricUnits.length - 1]!;
      conversionSystem = "metric";
    }

    const convertedV1 = convertQuantityValue(
      v1,
      unit1Def,
      targetUnitDef,
      conversionSystem,
    );
    const convertedV2 = convertQuantityValue(
      v2,
      unit2Def,
      targetUnitDef,
      conversionSystem,
    );
    const targetUnit: Unit = { name: targetUnitDef.name };

    return addQuantityValuesAndSetUnit(convertedV1, convertedV2, targetUnit);
  }

  // Case 5: the two quantities have different units of unknown type
  throw new IncompatibleUnitsError(
    q1.unit?.name as string,
    q2.unit?.name as string,
  );
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
