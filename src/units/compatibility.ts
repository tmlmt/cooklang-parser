import type {
  SpecificUnitSystem,
  UnitDefinition,
  UnitDefinitionLike,
} from "../types";

/**
 * Check if two unit-like objects are compatible for grouping.
 * Uses strict matching: same name OR (same type AND same system).
 * This is used for shopping list grouping where we don't want to
 * auto-merge different measurement systems.
 */
export function areUnitsGroupable(
  u1: UnitDefinitionLike,
  u2: UnitDefinitionLike,
): boolean {
  if (u1.name === u2.name) {
    return true;
  }
  if (u1.type === "other" || u2.type === "other") {
    return false;
  }
  // Same type AND same system (or both ambiguous)
  if (u1.type === u2.type && u1.system === u2.system) {
    return true;
  }
  // Ambiguous units are compatible with units from systems they support
  // For grouping purposes, we treat ambiguous as compatible with metric (default) only if they have a metric definition
  if (u1.type === u2.type) {
    // Ambiguous units are compatible with metric ONLY if they have a metric definition
    if (
      u1.system === "ambiguous" &&
      u2.system === "metric" &&
      u1.toBaseBySystem?.metric !== undefined
    ) {
      return true;
    }
    if (
      u2.system === "ambiguous" &&
      u1.system === "metric" &&
      u2.toBaseBySystem?.metric !== undefined
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Check if two units are convertible for addition/conversion.
 * Units are convertible if:
 * - They have the same name, OR
 * - They have the same type (regardless of system - cross-system conversion is allowed)
 *
 * @param u1 - First unit definition
 * @param u2 - Second unit definition
 * @returns true if the units can be added/converted
 */
export function areUnitsConvertible(
  u1: UnitDefinition,
  u2: UnitDefinition,
): boolean {
  if (u1.name === u2.name) return true;
  if (u1.type === "other" || u2.type === "other") return false;
  // Same type = compatible (cross-system conversion is allowed)
  return u1.type === u2.type;
}

/**
 * Check if a unit is compatible with a given system.
 * - Metric units are compatible with metric
 * - Ambiguous units are compatible if they have toBaseBySystem entry for the system
 * - Units of the specified system are always compatible
 */
export function isUnitCompatibleWithSystem(
  unit: UnitDefinition,
  system: SpecificUnitSystem,
): boolean {
  if (unit.system === system) return true;
  if (unit.system === "ambiguous") {
    // Ambiguous units with toBaseBySystem are compatible only with systems they support
    /* v8 ignore else -- @preserve */
    if (unit.toBaseBySystem) {
      return system in unit.toBaseBySystem;
    }
    // Ambiguous units without specific system support are compatible with metric by default
    /* v8 ignore next -- @preserve: defensive fallback for ambiguous units without toBaseBySystem */
    if (system === "metric") return true;
  }
  /* v8 ignore else -- @preserve */
  if (unit.system === "metric" && system === "JP") {
    return true;
  }
  return false;
}
