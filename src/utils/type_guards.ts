import type {
  Group,
  OrGroup,
  AndGroup,
  QuantityWithUnitLike,
  DecimalValue,
  FractionValue,
  FixedValue,
  Range,
} from "../types";

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
