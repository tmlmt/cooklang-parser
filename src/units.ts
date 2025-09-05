import type { FixedValue, Range, DecimalValue, FractionValue } from "./types";
export type UnitType = "mass" | "volume" | "count";
export type UnitSystem = "metric" | "imperial";

export interface UnitDefinition {
  name: string; // canonical name, e.g. 'g'
  type: UnitType;
  system: UnitSystem;
  aliases: string[]; // e.g. ['gram', 'grams']
  toBase: number; // conversion factor to the base unit of its type
}

export interface Quantity {
  value: FixedValue | Range;
  unit: string;
}

// Base units: mass -> gram (g), volume -> milliliter (ml)
const units: UnitDefinition[] = [
  // Mass (Metric)
  {
    name: "g",
    type: "mass",
    system: "metric",
    aliases: ["gram", "grams", "grammes"],
    toBase: 1,
  },
  {
    name: "kg",
    type: "mass",
    system: "metric",
    aliases: ["kilogram", "kilograms", "kilogrammes", "kilos", "kilo"],
    toBase: 1000,
  },
  // Mass (Imperial)
  {
    name: "oz",
    type: "mass",
    system: "imperial",
    aliases: ["ounce", "ounces"],
    toBase: 28.3495,
  },
  {
    name: "lb",
    type: "mass",
    system: "imperial",
    aliases: ["pound", "pounds"],
    toBase: 453.592,
  },

  // Volume (Metric)
  {
    name: "ml",
    type: "volume",
    system: "metric",
    aliases: ["milliliter", "milliliters", "millilitre", "millilitres", "cc"],
    toBase: 1,
  },
  {
    name: "l",
    type: "volume",
    system: "metric",
    aliases: ["liter", "liters", "litre", "litres"],
    toBase: 1000,
  },
  {
    name: "tsp",
    type: "volume",
    system: "metric",
    aliases: ["teaspoon", "teaspoons"],
    toBase: 5,
  },
  {
    name: "tbsp",
    type: "volume",
    system: "metric",
    aliases: ["tablespoon", "tablespoons"],
    toBase: 15,
  },

  // Volume (Imperial)
  {
    name: "fl-oz",
    type: "volume",
    system: "imperial",
    aliases: ["fluid ounce", "fluid ounces"],
    toBase: 29.5735,
  },
  {
    name: "cup",
    type: "volume",
    system: "imperial",
    aliases: ["cups"],
    toBase: 236.588,
  },
  {
    name: "pint",
    type: "volume",
    system: "imperial",
    aliases: ["pints"],
    toBase: 473.176,
  },
  {
    name: "quart",
    type: "volume",
    system: "imperial",
    aliases: ["quarts"],
    toBase: 946.353,
  },
  {
    name: "gallon",
    type: "volume",
    system: "imperial",
    aliases: ["gallons"],
    toBase: 3785.41,
  },

  // Count units (no conversion, but recognized as a type)
  {
    name: "piece",
    type: "count",
    system: "metric",
    aliases: ["pieces", "pc"],
    toBase: 1,
  },
];

const unitMap = new Map<string, UnitDefinition>();
for (const unit of units) {
  unitMap.set(unit.name.toLowerCase(), unit);
  for (const alias of unit.aliases) {
    unitMap.set(alias.toLowerCase(), unit);
  }
}

export function normalizeUnit(unit: string): UnitDefinition | undefined {
  return unitMap.get(unit.toLowerCase().trim());
}

export class CannotAddTextValueError extends Error {
  constructor() {
    super("Cannot add a quantity with a text value.");
    this.name = "CannotAddTextValueError";
  }
}

export class IncompatibleUnitsError extends Error {
  constructor(unit1: string, unit2: string) {
    super(
      `Cannot add quantities with incompatible or unknown units: ${unit1} and ${unit2}`,
    );
    this.name = "IncompatibleUnitsError";
  }
}

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
    return { type: "decimal", value: simplifiedNum };
  } else {
    return { type: "fraction", num: simplifiedNum, den: simplifiedDen };
  }
}

export function multiplyNumericValue(
  v: DecimalValue | FractionValue,
  factor: number,
): DecimalValue | FractionValue {
  if (v.type === "decimal") {
    return { type: "decimal", value: v.value * factor };
  }
  return simplifyFraction(v.num * factor, v.den);
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
    num1 = val1.value;
    den1 = 1;
  } else {
    num1 = val1.num;
    den1 = val1.den;
  }

  if (val2.type === "decimal") {
    num2 = val2.value;
    den2 = 1;
  } else {
    num2 = val2.num;
    den2 = val2.den;
  }

  // We only return a fraction where both input values are fractions themselves
  if (val1.type === "fraction" && val2.type === "fraction") {
    const commonDen = den1 * den2;
    const sumNum = num1 * den2 + num2 * den1;
    return simplifyFraction(sumNum, commonDen);
  } else {
    return { type: "decimal", value: num1 / den1 + num2 / den2 };
  }
}

const toRoundedDecimal = (v: DecimalValue | FractionValue): DecimalValue => {
  const value = v.type === "decimal" ? v.value : v.num / v.den;
  return { type: "decimal", value: Math.floor(value * 100) / 100 };
};

export function multiplyQuantityValue(
  value: FixedValue | Range,
  factor: number,
): FixedValue | Range {
  if (value.type === "fixed") {
    return {
      type: "fixed",
      value: toRoundedDecimal(
        multiplyNumericValue(
          value.value as DecimalValue | FractionValue,
          factor,
        ),
      ),
    };
  }

  return {
    type: "range",
    min: toRoundedDecimal(multiplyNumericValue(value.min, factor)),
    max: toRoundedDecimal(multiplyNumericValue(value.max, factor)),
  };
}

const convertQuantityValue = (
  value: FixedValue | Range,
  def: UnitDefinition,
  targetDef: UnitDefinition,
): FixedValue | Range => {
  if (def.name === targetDef.name) return value;

  const factor = def.toBase / targetDef.toBase;

  return multiplyQuantityValue(value, factor);
};

/**
 * Adds two quantities, returning the result in the most appropriate unit.
 */
export function addQuantities(q1: Quantity, q2: Quantity): Quantity {
  const v1 = q1.value;
  const v2 = q2.value;

  // Case 1: one of the two values is a text, we throw an error we can catch on the other end
  if (
    (v1.type === "fixed" && v1.value.type === "text") ||
    (v2.type === "fixed" && v2.value.type === "text")
  ) {
    throw new CannotAddTextValueError();
  }

  const unit1Def = normalizeUnit(q1.unit);
  const unit2Def = normalizeUnit(q2.unit);

  const addQuantityValuesAndSetUnit = (
    val1: FixedValue | Range,
    val2: FixedValue | Range,
    unit: string,
  ): Quantity => {
    if (val1.type === "fixed" && val2.type === "fixed") {
      const res = addNumericValues(
        val1.value as DecimalValue | FractionValue,
        val2.value as DecimalValue | FractionValue,
      );
      return { value: { type: "fixed", value: res }, unit };
    }
    const r1 =
      val1.type === "range"
        ? val1
        : { type: "range", min: val1.value, max: val1.value };
    const r2 =
      val2.type === "range"
        ? val2
        : { type: "range", min: val2.value, max: val2.value };
    const newMin = addNumericValues(
      r1.min as DecimalValue | FractionValue,
      r2.min as DecimalValue | FractionValue,
    );
    const newMax = addNumericValues(
      r1.max as DecimalValue | FractionValue,
      r2.max as DecimalValue | FractionValue,
    );
    return { value: { type: "range", min: newMin, max: newMax }, unit };
  };

  // Case 2: one of the two values doesn't have a unit, we consider its value to be 0 and the unit to be that of the other one
  if (q1.unit === "" && unit2Def) {
    return addQuantityValuesAndSetUnit(v1, v2, q2.unit); // Prefer q2's unit
  }
  if (q2.unit === "" && unit1Def) {
    return addQuantityValuesAndSetUnit(v1, v2, q1.unit); // Prefer q1's unit
  }

  // Case 3: the two quantities have the exact same unit
  if (q1.unit.toLowerCase() === q2.unit.toLowerCase()) {
    return addQuantityValuesAndSetUnit(v1, v2, q1.unit);
  }

  // Case 4: the two quantities do not have the same unit
  if (unit1Def && unit2Def) {
    // Case 4.1: different unit type => we can't add quantities

    if (unit1Def.type !== unit2Def.type) {
      throw new IncompatibleUnitsError(
        `${unit1Def.type} (${q1.unit})`,
        `${unit2Def.type} (${q2.unit})`,
      );
    }

    let targetUnitDef: UnitDefinition;

    // Case 4.2: same unit type but different system => we convert to metric
    if (unit1Def.system !== unit2Def.system) {
      const metricUnitDef = unit1Def.system === "metric" ? unit1Def : unit2Def;
      targetUnitDef = units
        .filter((u) => u.type === metricUnitDef.type && u.system === "metric")
        .reduce((prev, current) =>
          prev.toBase > current.toBase ? prev : current,
        );
    }
    // Case 4.3: same unit type, same system but different unit => we use the biggest unit of the two
    else {
      targetUnitDef = unit1Def.toBase >= unit2Def.toBase ? unit1Def : unit2Def;
    }
    const convertedV1 = convertQuantityValue(v1, unit1Def, targetUnitDef);
    const convertedV2 = convertQuantityValue(v2, unit2Def, targetUnitDef);

    return addQuantityValuesAndSetUnit(
      convertedV1,
      convertedV2,
      targetUnitDef.name,
    );
  }

  throw new IncompatibleUnitsError(q1.unit, q2.unit);
}
