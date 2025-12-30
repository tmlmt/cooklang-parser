import Big from "big.js";
import type { FixedValue, Range, QuantityWithUnitDef } from "../types";
import { getNumericValue } from "./numeric";

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
