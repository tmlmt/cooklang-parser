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
  value: number | string;
  unit: string;
}

// Base units: mass -> gram (g), volume -> milliliter (ml)
const units: UnitDefinition[] = [
  // Mass (Metric)
  {
    name: "g",
    type: "mass",
    system: "metric",
    aliases: ["gram", "grams"],
    toBase: 1,
  },
  {
    name: "kg",
    type: "mass",
    system: "metric",
    aliases: ["kilogram", "kilograms"],
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
    aliases: ["milliliter", "milliliters", "millilitre", "millilitres"],
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
    aliases: ["pieces"],
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

/**
 * Adds two quantities, returning the result in the most appropriate unit.
 */
export function addQuantities(q1: Quantity, q2: Quantity): Quantity {
  const unit1Def = normalizeUnit(q1.unit);
  const unit2Def = normalizeUnit(q2.unit);

  if (isNaN(Number(q1.value))) {
    throw new Error(
      `Cannot add quantity to string-quantified value: ${q1.value}`,
    );
  }
  if (isNaN(Number(q2.value))) {
    throw new Error(
      `Cannot add quantity to string-quantified value: ${q2.value}`,
    );
  }

  // If one unit is empty, assume it's of the same type as the other
  if (q1.unit === "" && unit2Def) {
    return {
      value:
        Math.round(((q1.value as number) + (q2.value as number)) * 100) / 100,
      unit: q2.unit,
    };
  }
  if (q2.unit === "" && unit1Def) {
    return {
      value:
        Math.round(((q1.value as number) + (q2.value as number)) * 100) / 100,
      unit: q1.unit,
    };
  }

  // If both units are the same (even if unknown, e.g. "cloves")
  if (q1.unit.toLowerCase() === q2.unit.toLowerCase()) {
    return {
      value:
        Math.round(((q1.value as number) + (q2.value as number)) * 100) / 100,
      unit: q1.unit,
    };
  }

  // If both are known and compatible
  if (unit1Def && unit2Def) {
    if (unit1Def.type !== unit2Def.type) {
      throw new Error(
        `Cannot add quantities of different types: ${unit1Def.type} (${q1.unit}) and ${unit2Def.type} (${q2.unit})`,
      );
    }

    // Convert both to base unit value
    const baseValue1 = (q1.value as number) * unit1Def.toBase;
    const baseValue2 = (q2.value as number) * unit2Def.toBase;
    const totalBaseValue = baseValue1 + baseValue2;

    let targetUnitDef: UnitDefinition;

    // Rule: If systems differ, convert to the largest metric unit.
    if (unit1Def.system !== unit2Def.system) {
      const metricUnitDef = unit1Def.system === "metric" ? unit1Def : unit2Def;
      targetUnitDef = units
        .filter((u) => u.type === metricUnitDef.type && u.system === "metric")
        .reduce((prev, current) =>
          prev.toBase > current.toBase ? prev : current,
        );
    } else {
      // Rule: Same system, use the biggest of the two input units.
      targetUnitDef = unit1Def.toBase >= unit2Def.toBase ? unit1Def : unit2Def;
    }

    const finalValue = totalBaseValue / targetUnitDef.toBase;

    return {
      value: Math.round(finalValue * 100) / 100,
      unit: targetUnitDef.name,
    };
  }

  // Otherwise, units are different and at least one is unknown.
  throw new Error(
    `Cannot add quantities with incompatible or unknown units: ${q1.unit} and ${q2.unit}`,
  );
}
