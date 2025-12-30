import type { FixedValue, Range, DecimalValue, FractionValue } from "../types";

function isNumericValueIntegerLike(v: DecimalValue | FractionValue): boolean {
  if (v.type === "decimal") return Number.isInteger(v.decimal);
  // fraction: integer-like when numerator divisible by denominator
  return v.num % v.den === 0;
}

export function isValueIntegerLike(q: FixedValue | Range) {
  if (q.type === "fixed") {
    if (q.value.type === "text") return false;
    return isNumericValueIntegerLike(q.value);
  }
  // Range: integer-like when both min and max are integer-like
  return isNumericValueIntegerLike(q.min) && isNumericValueIntegerLike(q.max);
}
