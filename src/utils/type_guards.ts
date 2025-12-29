import type {
  Group,
  OrGroup,
  AndGroup,
  QuantityWithUnitLike,
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
