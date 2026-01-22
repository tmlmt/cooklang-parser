import type {
  Group,
  OrGroup,
  AndGroup,
  QuantityWithUnitLike,
  DecimalValue,
  FractionValue,
  FixedValue,
  Range,
  IngredientQuantityGroup,
  IngredientQuantityAndGroup,
  AlternativeIngredientRef,
} from "../types";

// Helper type-checks (as before)
export function isGroup(x: QuantityWithUnitLike | Group): x is Group {
  return "and" in x || "or" in x;
}
export function isOrGroup(x: QuantityWithUnitLike | Group): x is OrGroup {
  return isGroup(x) && "or" in x;
}
/**
 * Type guard to check if an ingredient quantity-like object is an AND group.
 * *
 * @param x - The quantity-like entry to check
 * @returns true if this is an AND group (has `and` property)
 * @category Helpers
 *
 * @example
 * ```typescript
 * for (const entry of ingredient.quantities) {
 *   if (isAndGroup(entry)) {
 *     // entry.and contains the list of quantities in the AND group
 *   }
 * }
 * ```
 */
export function isAndGroup(
  x: IngredientQuantityGroup | IngredientQuantityAndGroup,
): x is IngredientQuantityAndGroup;
export function isAndGroup(x: QuantityWithUnitLike | Group): x is AndGroup;
export function isAndGroup(
  x:
    | QuantityWithUnitLike
    | Group
    | IngredientQuantityGroup
    | IngredientQuantityAndGroup,
): boolean {
  return "and" in x;
}
export function isQuantity(
  x: QuantityWithUnitLike | Group,
): x is QuantityWithUnitLike {
  return x && typeof x === "object" && "quantity" in x;
}

/**
 * Type guard to check if an ingredient quantity entry is a simple group.
 *
 * Simple groups have a single quantity with optional unit and equivalents.
 *
 * @param entry - The quantity entry to check
 * @returns true if this is a simple group (has `quantity` property)
 * @category Helpers
 *
 * @example
 * ```typescript
 * for (const entry of ingredient.quantities) {
 *   if (isSimpleGroup(entry)) {
 *     // entry.quantity is available
 *     // entry.unit is available
 *   }
 * }
 * ```
 */
export function isSimpleGroup(
  entry: IngredientQuantityGroup | IngredientQuantityAndGroup,
): entry is IngredientQuantityGroup {
  return "quantity" in entry;
}

function isNumericValueIntegerLike(v: DecimalValue | FractionValue): boolean {
  if (v.type === "decimal") return Number.isInteger(v.decimal);
  // fraction: integer-like when numerator divisible by denominator
  return v.num % v.den === 0;
}

export function isValueIntegerLike(q: FixedValue | Range): boolean {
  if (q.type === "fixed") {
    if (q.value.type === "text") return false;
    return isNumericValueIntegerLike(q.value);
  }
  // Range: integer-like when both min and max are integer-like
  return isNumericValueIntegerLike(q.min) && isNumericValueIntegerLike(q.max);
}

/**
 * Type guard to check if an ingredient quantity entry has alternatives.
 *
 * @param entry - The quantity entry to check
 * @returns true if this entry has alternatives
 * @category Helpers
 *
 * @example
 * ```typescript
 * for (const entry of ingredient.quantities) {
 *   if (hasAlternatives(entry)) {
 *     // entry.alternatives is available and non-empty
 *     for (const alt of entry.alternatives) {
 *       console.log(`Alternative ingredient index: ${alt.index}`);
 *     }
 *   }
 * }
 * ```
 */
export function hasAlternatives(
  entry: IngredientQuantityGroup | IngredientQuantityAndGroup,
): entry is (IngredientQuantityGroup | IngredientQuantityAndGroup) & {
  alternatives: AlternativeIngredientRef[];
} {
  return (
    "alternatives" in entry &&
    Array.isArray(entry.alternatives) &&
    entry.alternatives.length > 0
  );
}
