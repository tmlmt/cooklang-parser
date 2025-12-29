import Big from "big.js";
import type { DecimalValue, FractionValue, FixedValue, Range } from "../types";

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function simplifyFraction(
  num: number,
  den: number,
): DecimalValue | FractionValue {
  if (den === 0) {
    throw new Error("Denominator cannot be zero.");
  }

  const commonDivisor = gcd(Math.abs(num), Math.abs(den));
  let simplifiedNum = num / commonDivisor;
  let simplifiedDen = den / commonDivisor;
  if (simplifiedDen < 0) {
    simplifiedNum = -simplifiedNum;
    simplifiedDen = -simplifiedDen;
  }

  if (simplifiedDen === 1) {
    return { type: "decimal", decimal: simplifiedNum };
  } else {
    return { type: "fraction", num: simplifiedNum, den: simplifiedDen };
  }
}

export function getNumericValue(v: DecimalValue | FractionValue): number {
  if (v.type === "decimal") {
    return v.decimal;
  }
  return v.num / v.den;
}

export function multiplyNumericValue(
  v: DecimalValue | FractionValue,
  factor: number | Big,
): DecimalValue | FractionValue {
  if (v.type === "decimal") {
    return {
      type: "decimal",
      decimal: Big(v.decimal).times(factor).toNumber(),
    };
  }
  return simplifyFraction(Big(v.num).times(factor).toNumber(), v.den);
}

export function addNumericValues(
  val1: DecimalValue | FractionValue,
  val2: DecimalValue | FractionValue,
): DecimalValue | FractionValue {
  let num1: number;
  let den1: number;
  let num2: number;
  let den2: number;

  if (val1.type === "decimal") {
    num1 = val1.decimal;
    den1 = 1;
  } else {
    num1 = val1.num;
    den1 = val1.den;
  }

  if (val2.type === "decimal") {
    num2 = val2.decimal;
    den2 = 1;
  } else {
    num2 = val2.num;
    den2 = val2.den;
  }

  // Return 0 if both values are 0
  if (num1 === 0 && num2 === 0) {
    return { type: "decimal", decimal: 0 };
  }

  // We only return a fraction where both input values are fractions themselves or only one while the other is 0
  if (
    (val1.type === "fraction" && val2.type === "fraction") ||
    (val1.type === "fraction" &&
      val2.type === "decimal" &&
      val2.decimal === 0) ||
    (val2.type === "fraction" && val1.type === "decimal" && val1.decimal === 0)
  ) {
    const commonDen = den1 * den2;
    const sumNum = num1 * den2 + num2 * den1;
    return simplifyFraction(sumNum, commonDen);
  } else {
    return {
      type: "decimal",
      decimal: Big(num1).div(den1).add(Big(num2).div(den2)).toNumber(),
    };
  }
}

export const toRoundedDecimal = (
  v: DecimalValue | FractionValue,
): DecimalValue => {
  const value = v.type === "decimal" ? v.decimal : v.num / v.den;
  return { type: "decimal", decimal: Math.round(value * 1000) / 1000 };
};

export function multiplyQuantityValue(
  value: FixedValue | Range,
  factor: number | Big,
): FixedValue | Range {
  if (value.type === "fixed") {
    const newValue = multiplyNumericValue(
      value.value as DecimalValue | FractionValue,
      Big(factor),
    );
    if (
      factor === parseInt(factor.toString()) || // e.g. 2 === int
      Big(1).div(factor).toNumber() === parseInt(Big(1).div(factor).toString()) // e.g. 0.25 => 4 === int
    ) {
      // Preserve fractions
      return {
        type: "fixed",
        value: newValue,
      };
    }
    // We might multiply with big decimal number so rounding into decimal value
    return {
      type: "fixed",
      value: toRoundedDecimal(newValue),
    };
  }

  return {
    type: "range",
    min: multiplyNumericValue(value.min, factor),
    max: multiplyNumericValue(value.max, factor),
  };
}
