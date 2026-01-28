import Big from "big.js";
import type {
  DecimalValue,
  FractionValue,
  FixedValue,
  Range,
  UnitDefinition,
} from "../types";

/** Default allowed denominators for fraction approximation */
export const DEFAULT_DENOMINATORS = [2, 3, 4, 8];
/** Default accuracy tolerance for fraction approximation (5%) */
export const DEFAULT_FRACTION_ACCURACY = 0.05;
/** Default maximum whole number in mixed fraction before falling back to decimal */
export const DEFAULT_MAX_WHOLE = 4;

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

/**
 * Approximates a decimal value as a fraction within a given accuracy tolerance.
 * Returns an improper fraction (e.g., 1.25 → \{ num: 5, den: 4 \}) or null if no good match.
 *
 * @param value - The decimal value to approximate
 * @param denominators - Allowed denominators (default: [2, 3, 4, 8])
 * @param accuracy - Maximum relative error tolerance (default: 0.05 = 5%)
 * @param maxWhole - Maximum whole number part before returning null (default: 4)
 * @returns FractionValue if a good approximation exists, null otherwise
 */
export function approximateFraction(
  value: number,
  denominators: number[] = DEFAULT_DENOMINATORS,
  accuracy: number = DEFAULT_FRACTION_ACCURACY,
  maxWhole: number = DEFAULT_MAX_WHOLE,
): FractionValue | null {
  // Only handle positive values
  if (value <= 0 || !Number.isFinite(value)) {
    return null;
  }

  // Check if whole part exceeds maxWhole
  const wholePart = Math.floor(value);
  if (wholePart > maxWhole) {
    return null;
  }

  // If value is very close to an integer, return null (use decimal instead)
  const fractionalPart = value - wholePart;
  if (fractionalPart < 1e-4) {
    return null;
  }

  let bestFraction: { num: number; den: number; error: number } | null = null;

  for (const den of denominators) {
    // Find the numerator that gives the closest approximation
    const exactNum = value * den;
    const roundedNum = Math.round(exactNum);

    // Skip if this would give 0 numerator
    if (roundedNum === 0) continue;

    const approximatedValue = roundedNum / den;
    const relativeError = Math.abs(approximatedValue - value) / value;

    // Check if within accuracy tolerance
    if (relativeError <= accuracy) {
      // Prefer smaller denominators (they come first in the array)
      // and smaller error for same denominator
      if (!bestFraction || relativeError < bestFraction.error) {
        bestFraction = { num: roundedNum, den, error: relativeError };
      }
    }
  }

  if (!bestFraction) {
    return null;
  }

  // Simplify the fraction
  const commonDivisor = gcd(bestFraction.num, bestFraction.den);
  return {
    type: "fraction",
    num: bestFraction.num / commonDivisor,
    den: bestFraction.den / commonDivisor,
  };
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

/**
 * Rounds a numeric value to the specified number of significant digits.
 * If the integer part has 4+ digits, preserves the full integer (rounds to nearest integer).
 * @param v - The value to round (decimal or fraction)
 * @param precision - Number of significant digits (default 3)
 * @returns A DecimalValue with the rounded result
 */
export const toRoundedDecimal = (
  v: DecimalValue | FractionValue,
  precision: number = 3,
): DecimalValue => {
  const value = v.type === "decimal" ? v.decimal : v.num / v.den;

  // Handle zero specially
  if (value === 0) {
    return { type: "decimal", decimal: 0 };
  }

  const absValue = Math.abs(value);

  // If integer part has 4+ digits, round to nearest integer
  if (absValue >= 1000) {
    return { type: "decimal", decimal: Math.round(value) };
  }

  // Calculate the order of magnitude for significant digits
  const magnitude = Math.floor(Math.log10(absValue));
  const scale = Math.pow(10, precision - 1 - magnitude);
  const rounded = Math.round(value * scale) / scale;

  return { type: "decimal", decimal: rounded };
};

/**
 * Formats a numeric value for output, using fractions if the unit supports them
 * and the value can be well-approximated as a fraction, otherwise as a rounded decimal.
 *
 * @param value - The decimal value to format
 * @param unitDef - The unit definition (to check fraction config)
 * @param precision - Number of significant digits for decimal rounding (default 3)
 * @returns A DecimalValue or FractionValue
 */
export const formatOutputValue = (
  value: number,
  unitDef: UnitDefinition,
  precision: number = 3,
): DecimalValue | FractionValue => {
  // Check if unit has fractions enabled
  if (unitDef.fractions?.enabled) {
    const denominators = unitDef.fractions.denominators ?? DEFAULT_DENOMINATORS;
    const maxWhole = unitDef.fractions.maxWhole ?? DEFAULT_MAX_WHOLE;

    const fraction = approximateFraction(
      value,
      denominators,
      DEFAULT_FRACTION_ACCURACY,
      maxWhole,
    );
    if (fraction) {
      return fraction;
    }
  }

  // Fall back to rounded decimal
  return toRoundedDecimal({ type: "decimal", decimal: value }, precision);
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
      newValue.type === "fraction" &&
      (Big(factor).toNumber() === parseInt(Big(factor).toString()) || // e.g. 2 === int
        Big(1).div(factor).toNumber() ===
          parseInt(Big(1).div(factor).toString())) // e.g. 0.25 => 4 === int
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

export function getAverageValue(q: FixedValue | Range): string | number {
  if (q.type === "fixed") {
    return q.value.type === "text" ? q.value.text : getNumericValue(q.value);
  } else {
    return (getNumericValue(q.min) + getNumericValue(q.max)) / 2;
  }
}
