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
  // Mass (US/UK - identical in both systems)
  {
    name: "oz",
    type: "mass",
    system: "ambiguous",
    aliases: ["ounce", "ounces"],
    toBase: 28.3495, // default: US (same as UK)
    toBaseBySystem: { US: 28.3495, UK: 28.3495 },
  },
  {
    name: "lb",
    type: "mass",
    system: "ambiguous",
    aliases: ["pound", "pounds"],
    toBase: 453.592, // default: US (same as UK)
    toBaseBySystem: { US: 453.592, UK: 453.592 },
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

  // Volume (JP)
  {
    name: "go",
    type: "volume",
    system: "JP",
    aliases: ["gou", "goo", "合", "rice cup"],
    toBase: 180,
  },

  // Volume (Ambiguous: metric/US/UK)
  {
    name: "tsp",
    type: "volume",
    system: "ambiguous",
    aliases: ["teaspoon", "teaspoons"],
    toBase: 5, // default: metric
    toBaseBySystem: { metric: 5, US: 4.929, UK: 5.919 },
  },
  {
    name: "tbsp",
    type: "volume",
    system: "ambiguous",
    aliases: ["tablespoon", "tablespoons"],
    toBase: 15, // default: metric
    toBaseBySystem: { metric: 15, US: 14.787, UK: 17.758 },
  },

  // Volume (Ambiguous: US/UK only)
  {
    name: "fl-oz",
    type: "volume",
    system: "ambiguous",
    aliases: ["fluid ounce", "fluid ounces"],
    toBase: 29.5735, // default: US
    toBaseBySystem: { US: 29.5735, UK: 28.4131 },
  },
  {
    name: "cup",
    type: "volume",
    system: "ambiguous",
    aliases: ["cups"],
    toBase: 236.588, // default: US
    toBaseBySystem: { US: 236.588, UK: 284.131 },
  },
  {
    name: "pint",
    type: "volume",
    system: "ambiguous",
    aliases: ["pints"],
    toBase: 473.176, // default: US
    toBaseBySystem: { US: 473.176, UK: 568.261 },
  },
  {
    name: "quart",
    type: "volume",
    system: "ambiguous",
    aliases: ["quarts"],
    toBase: 946.353, // default: US
    toBaseBySystem: { US: 946.353, UK: 1136.52 },
  },
  {
    name: "gallon",
    type: "volume",
    system: "ambiguous",
    aliases: ["gallons"],
    toBase: 3785.41, // default: US
    toBaseBySystem: { US: 3785.41, UK: 4546.09 },
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
