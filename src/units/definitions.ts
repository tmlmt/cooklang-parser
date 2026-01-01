import type { UnitDefinition, UnitDefinitionLike } from "../types";

// Base units: mass -> gram (g), volume -> milliliter (ml)
export const units: UnitDefinition[] = [
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
    name: "cl",
    type: "volume",
    system: "metric",
    aliases: ["centiliter", "centiliters", "centilitre", "centilitres"],
    toBase: 10,
  },
  {
    name: "dl",
    type: "volume",
    system: "metric",
    aliases: ["deciliter", "deciliters", "decilitre", "decilitres"],
    toBase: 100,
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

export function normalizeUnit(unit: string = ""): UnitDefinition | undefined {
  return unitMap.get(unit.toLowerCase().trim());
}

export const NO_UNIT = "__no-unit__";

export function resolveUnit(
  name: string = NO_UNIT,
  integerProtected: boolean = false,
): UnitDefinitionLike {
  const normalizedUnit = normalizeUnit(name);
  const resolvedUnit: UnitDefinitionLike = normalizedUnit
    ? { ...normalizedUnit, name }
    : { name, type: "other", system: "none" };
  return integerProtected
    ? { ...resolvedUnit, integerProtected: true }
    : resolvedUnit;
}

export function isNoUnit(unit?: UnitDefinitionLike): boolean {
  if (!unit) return true;
  return resolveUnit(unit.name).name === NO_UNIT;
}
