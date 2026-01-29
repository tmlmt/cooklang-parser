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
    maxValue: 999,
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
    maxValue: 31, // 16 oz = 1 lb, allow a bit more
    fractions: { enabled: true, denominators: [2] },
  },
  {
    name: "lb",
    type: "mass",
    system: "ambiguous",
    aliases: ["pound", "pounds"],
    toBase: 453.592, // default: US (same as UK)
    toBaseBySystem: { US: 453.592, UK: 453.592 },
    fractions: { enabled: true, denominators: [2, 4] },
  },

  // Volume (Metric)
  {
    name: "ml",
    type: "volume",
    system: "metric",
    aliases: ["milliliter", "milliliters", "millilitre", "millilitres", "cc"],
    toBase: 1,
    maxValue: 999,
  },
  {
    name: "cl",
    type: "volume",
    system: "metric",
    aliases: ["centiliter", "centiliters", "centilitre", "centilitres"],
    toBase: 10,
    isBestUnit: false, // exists but not a "best" candidate
  },
  {
    name: "dl",
    type: "volume",
    system: "metric",
    aliases: ["deciliter", "deciliters", "decilitre", "decilitres"],
    toBase: 100,
    isBestUnit: false, // exists but not a "best" candidate
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
    maxValue: 10,
  },

  // Volume (Ambiguous: metric/US/UK)
  {
    name: "tsp",
    type: "volume",
    system: "ambiguous",
    aliases: ["teaspoon", "teaspoons"],
    toBase: 5, // default: metric
    toBaseBySystem: { metric: 5, US: 4.929, UK: 5.919, JP: 5 },
    maxValue: 5, // 3 tsp = 1 tbsp (but allow a bit more)
    fractions: { enabled: true, denominators: [2, 3, 4, 8] },
  },
  {
    name: "tbsp",
    type: "volume",
    system: "ambiguous",
    aliases: ["tablespoon", "tablespoons"],
    toBase: 15, // default: metric
    toBaseBySystem: { metric: 15, US: 14.787, UK: 17.758, JP: 15 },
    maxValue: 4, // ~16 tbsp = 1 cup
    fractions: { enabled: true },
  },

  // Volume (Ambiguous: US/UK only)
  {
    name: "fl-oz",
    type: "volume",
    system: "ambiguous",
    aliases: ["fluid ounce", "fluid ounces"],
    toBase: 29.5735, // default: US
    toBaseBySystem: { US: 29.5735, UK: 28.4131 },
    maxValue: 15, // 8 fl-oz ~ 1 cup, allow more
    fractions: { enabled: true, denominators: [2] },
  },
  {
    name: "cup",
    type: "volume",
    system: "ambiguous",
    aliases: ["cups"],
    toBase: 236.588, // default: US
    toBaseBySystem: { US: 236.588, UK: 284.131 },
    maxValue: 15, // upgrade to gallons above 15 cups
    fractions: { enabled: true },
  },
  {
    name: "pint",
    type: "volume",
    system: "ambiguous",
    aliases: ["pints"],
    toBase: 473.176, // default: US
    toBaseBySystem: { US: 473.176, UK: 568.261 },
    maxValue: 3, // 2 pints = 1 quart
    fractions: { enabled: true, denominators: [2] },
    isBestUnit: false, // exists but not a "best" candidate
  },
  {
    name: "quart",
    type: "volume",
    system: "ambiguous",
    aliases: ["quarts"],
    toBase: 946.353, // default: US
    toBaseBySystem: { US: 946.353, UK: 1136.52 },
    maxValue: 3, // 4 quarts = 1 gallon
    fractions: { enabled: true, denominators: [2] },
    isBestUnit: false, // exists but not a "best" candidate
  },
  {
    name: "gallon",
    type: "volume",
    system: "ambiguous",
    aliases: ["gallons"],
    toBase: 3785.41, // default: US
    toBaseBySystem: { US: 3785.41, UK: 4546.09 },
    fractions: { enabled: true, denominators: [2] },
  },

  // Count units (no conversion, but recognized as a type)
  {
    name: "piece",
    type: "count",
    system: "metric",
    aliases: ["pieces", "pc"],
    toBase: 1,
    maxValue: 999,
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
