import type {
  IngredientItem,
  RecipeChoices,
  FixedValue,
  Range,
  TextValue,
  DecimalValue,
  FractionValue,
  Unit,
  QuantityWithExtendedUnit,
  MaybeScalableQuantity,
  Step,
} from "../types";
import { Recipe } from "../classes/recipe";
import { Section } from "../classes/section";

// ============================================================================
// Quantity Formatting Helpers
// ============================================================================

/**
 * Map of common fractions to their Unicode vulgar fraction characters.
 */
const VULGAR_FRACTIONS: Record<string, string> = {
  "1/2": "½",
  "1/3": "⅓",
  "2/3": "⅔",
  "1/4": "¼",
  "3/4": "¾",
  "1/8": "⅛",
  "3/8": "⅜",
  "5/8": "⅝",
  "7/8": "⅞",
};

/**
 * Render a fraction using Unicode vulgar fraction characters when available.
 * Handles improper fractions by extracting the whole part (e.g., 5/4 → "1¼").
 *
 * @param num - The numerator
 * @param den - The denominator
 * @returns The fraction as a string, using vulgar characters if available
 * @category Helpers
 *
 * @example
 * ```typescript
 * renderFractionAsVulgar(1, 2); // "½"
 * renderFractionAsVulgar(3, 4); // "¾"
 * renderFractionAsVulgar(5, 4); // "1¼"
 * renderFractionAsVulgar(7, 3); // "2⅓"
 * renderFractionAsVulgar(2, 5); // "2/5" (no vulgar character available)
 * ```
 */
export function renderFractionAsVulgar(num: number, den: number): string {
  // Handle improper fractions (num >= den)
  const wholePart = Math.floor(num / den);
  const remainder = num % den;

  if (remainder === 0) {
    // Exact integer
    return String(wholePart);
  }

  const fractionKey = `${remainder}/${den}`;
  const vulgar = VULGAR_FRACTIONS[fractionKey];

  if (wholePart > 0) {
    // Mixed fraction: whole part + fractional part
    return vulgar
      ? `${wholePart}${vulgar}`
      : `${wholePart} ${remainder}/${den}`;
  }

  // Proper fraction only
  return vulgar ?? `${num}/${den}`;
}

/**
 * Format a numeric value (decimal or fraction) to a string.
 *
 * @param value - The decimal or fraction value to format
 * @param useVulgar - Whether to use Unicode vulgar fraction characters (default: true)
 * @returns The formatted string representation
 * @category Helpers
 *
 * @example
 * ```typescript
 * formatNumericValue({ type: "decimal", decimal: 1.5 }); // "1.5"
 * formatNumericValue({ type: "fraction", num: 1, den: 2 }); // "½"
 * formatNumericValue({ type: "fraction", num: 1, den: 2 }, false); // "1/2"
 * formatNumericValue({ type: "fraction", num: 5, den: 4 }, true); // "1¼"
 * ```
 */
export function formatNumericValue(
  value: DecimalValue | FractionValue,
  useVulgar: boolean = true,
): string {
  if (value.type === "decimal") {
    return String(value.decimal);
  }
  if (useVulgar) {
    return renderFractionAsVulgar(value.num, value.den);
  }
  return `${value.num}/${value.den}`;
}

/**
 * Format a single value (text, decimal, or fraction) to a string.
 *
 * @param value - The value to format
 * @returns The formatted string representation
 * @category Helpers
 *
 * @example
 * ```typescript
 * formatSingleValue({ type: "text", text: "a pinch" }); // "a pinch"
 * formatSingleValue({ type: "decimal", decimal: 2 }); // "2"
 * formatSingleValue({ type: "fraction", num: 3, den: 4 }); // "3/4"
 * ```
 */
export function formatSingleValue(
  value: TextValue | DecimalValue | FractionValue,
): string {
  if (value.type === "text") {
    return value.text;
  }
  return formatNumericValue(value);
}

/**
 * Format a quantity (fixed value or range) to a string.
 *
 * @param quantity - The quantity to format
 * @returns The formatted string representation
 * @category Helpers
 *
 * @example
 * ```typescript
 * formatQuantity({ type: "fixed", value: { type: "decimal", decimal: 100 } }); // "100"
 * formatQuantity({ type: "range", min: { type: "decimal", decimal: 1 }, max: { type: "decimal", decimal: 2 } }); // "1-2"
 * ```
 */
export function formatQuantity(quantity: FixedValue | Range): string {
  if (quantity.type === "fixed") {
    return formatSingleValue(quantity.value);
  }
  // Range
  const minStr = formatNumericValue(quantity.min);
  const maxStr = formatNumericValue(quantity.max);
  return `${minStr}-${maxStr}`;
}

/**
 * Format a unit to a string. Handles both plain string units and Unit objects.
 *
 * @param unit - The unit to format (string, Unit object, or undefined)
 * @returns The formatted unit string, or empty string if undefined
 * @category Helpers
 *
 * @example
 * ```typescript
 * formatUnit("g"); // "g"
 * formatUnit({ name: "grams" }); // "grams"
 * formatUnit(undefined); // ""
 * ```
 */
export function formatUnit(unit: string | Unit | undefined): string {
  if (!unit) return "";
  if (typeof unit === "string") return unit;
  return unit.name;
}

/**
 * Format a quantity with its unit to a string.
 *
 * @param quantity - The quantity to format
 * @param unit - The unit to append (string, Unit object, or undefined)
 * @returns The formatted string with quantity and unit
 * @category Helpers
 *
 * @example
 * ```typescript
 * formatQuantityWithUnit({ type: "fixed", value: { type: "decimal", decimal: 100 } }, "g"); // "100 g"
 * formatQuantityWithUnit({ type: "fixed", value: { type: "decimal", decimal: 2 } }, undefined); // "2"
 * ```
 */
export function formatQuantityWithUnit(
  quantity: FixedValue | Range | undefined,
  unit: string | Unit | undefined,
): string {
  if (!quantity) return "";
  const qty = formatQuantity(quantity);
  const unitStr = formatUnit(unit);
  return unitStr ? `${qty} ${unitStr}` : qty;
}

/**
 * Format a QuantityWithExtendedUnit to a string.
 *
 * @param item - The quantity with extended unit to format
 * @returns The formatted string
 * @category Helpers
 */
export function formatExtendedQuantity(item: QuantityWithExtendedUnit): string {
  return formatQuantityWithUnit(item.quantity, item.unit);
}

/**
 * Format an IngredientItemQuantity with all its equivalents to a string.
 *
 * @param itemQuantity - The ingredient item quantity to format
 * @param separator - The separator between primary and equivalent quantities (default: " | ")
 * @returns The formatted string with all quantities
 * @category Helpers
 *
 * @example
 * ```typescript
 * // For an ingredient like @flour{100%g|3.5%oz}
 * formatItemQuantity(itemQuantity); // "100 g | 3.5 oz"
 * formatItemQuantity(itemQuantity, " / "); // "100 g / 3.5 oz"
 * ```
 */
export function formatItemQuantity(
  itemQuantity: MaybeScalableQuantity,
  separator: string = " | ",
): string {
  const parts: string[] = [];

  // Primary quantity
  parts.push(formatExtendedQuantity(itemQuantity));

  // Equivalents
  if (itemQuantity.equivalents) {
    for (const eq of itemQuantity.equivalents) {
      parts.push(formatExtendedQuantity(eq));
    }
  }

  return parts.join(separator);
}

// ============================================================================
// Ingredient Item Helpers
// ============================================================================

/**
 * Check if an ingredient item is a grouped alternative (vs inline alternative).
 *
 * Grouped alternatives are ingredients that share a group key (e.g., `@|milk|...`)
 * and are distributed across multiple tokens in the recipe.
 *
 * @param item - The ingredient item to check
 * @returns true if this is a grouped alternative
 * @category Helpers
 *
 * @example
 * ```typescript
 * for (const item of step.items) {
 *   if (item.type === 'ingredient') {
 *     if (isGroupedItem(item)) {
 *       // Handle grouped alternative (e.g., show with strikethrough if not selected)
 *     } else {
 *       // Handle inline alternative (e.g., hide if not selected)
 *     }
 *   }
 * }
 * ```
 */
export function isGroupedItem(item: IngredientItem): boolean {
  return item.group !== undefined;
}

// ============================================================================
// Alternative Selection Helpers
// ============================================================================

/**
 * Determines if a specific alternative in an IngredientItem is selected
 * based on the applied choices.
 *
 * Use this in renderers to determine how an ingredient alternative should be displayed.
 *
 * @param recipe - The Recipe instance containing choices
 * @param choices - The choices that have been made
 * @param item - The IngredientItem to check
 * @param alternativeIndex - The index within item.alternatives to check (for inline alternatives only)
 * @returns true if this alternative is the selected one
 * @category Helpers
 *
 * @example
 * ```typescript
 * const recipe = new Recipe(cooklangText);
 * for (const item of step.items) {
 *   if (item.type === 'ingredient') {
 *     item.alternatives.forEach((alt, idx) => {
 *       const isSelected = isAlternativeSelected(item, idx, recipe, choices);
 *       // Render differently based on isSelected
 *     });
 *   }
 * }
 * ```
 */
export function isAlternativeSelected(
  recipe: Recipe,
  choices: RecipeChoices,
  item: IngredientItem,
  alternativeIndex?: number,
): boolean {
  // Grouped alternatives: check ingredientGroups map
  if (item.group) {
    // Get the selected index in the group
    const selectedIndex = choices?.ingredientGroups?.get(item.group);
    // Get the subgroups array for this group
    const groupSubgroups = recipe.choices.ingredientGroups.get(item.group);
    if (
      groupSubgroups &&
      selectedIndex !== undefined &&
      selectedIndex < groupSubgroups.length
    ) {
      // Check if the selected subgroup contains this item's id
      const selectedSubgroup = groupSubgroups[selectedIndex]!;
      return selectedSubgroup?.some((alt) => alt.itemId === item.id);
    }
    return false;
  }

  // Inline alternatives: check ingredientItems map
  const selectedIndex = choices?.ingredientItems?.get(item.id);
  return alternativeIndex === selectedIndex;
}

// ============================================================================
// Variant Helpers
// ============================================================================

/**
 * Determines if a section is active (should be displayed or processed) for a given variant.
 *
 * - Sections with no `variants` property are always active.
 * - When no variant is selected (default), sections tagged `[*]` are active,
 *   and sections tagged with named variants are not.
 * - When a named variant is selected, sections whose `variants` array includes
 *   that name are active.
 *
 * @param section - The Section to check
 * @param variant - The active variant name, or `undefined`/`*` for the default variant
 * @returns `true` if the section should be displayed
 * @category Helpers
 *
 * @example
 * ```typescript
 * const recipe = new Recipe(cooklangText);
 * for (const section of recipe.sections) {
 *   if (isSectionActive(section, choices.variant)) {
 *     // render section
 *   }
 * }
 * ```
 */
export function isSectionActive(section: Section, variant?: string): boolean {
  if (!section.variants) return true;
  const isDefault = variant === undefined || variant === "*";
  if (isDefault) {
    return section.variants.includes("*");
  }
  return section.variants.includes(variant);
}

/**
 * Determines if a step is active (should be displayed) for a given variant.
 *
 * - Steps with no `variants` property are always active.
 * - When no variant is selected (default), steps tagged `[*]` are active,
 *   and steps tagged with named variants are not.
 * - When a named variant is selected, steps whose `variants` array includes
 *   that name are active.
 *
 * @param step - The Step to check
 * @param variant - The active variant name, or `undefined`/`*` for the default variant
 * @returns `true` if the step should be displayed
 * @category Helpers
 *
 * @example
 * ```typescript
 * for (const item of section.content) {
 *   if (item.type === 'step' && isStepActive(item, choices.variant)) {
 *     // render step
 *   }
 * }
 * ```
 */
export function isStepActive(step: Step, variant?: string): boolean {
  if (!step.variants) return true;
  const isDefault = variant === undefined || variant === "*";
  if (isDefault) {
    return step.variants.includes("*");
  }
  return step.variants.includes(variant);
}

/**
 * Returns the effective choices for a recipe given a variant selection.
 *
 * When a named variant is active, this scans ingredient alternatives whose
 * `note` contains the variant name (case-insensitive substring match) and
 * returns a `RecipeChoices` object with auto-selected alternatives.
 *
 * For inline alternatives: auto-selects the first alternative whose note
 * matches the variant name.
 *
 * For grouped alternatives: auto-selects the first subgroup that has any
 * alternative whose note matches the variant name.
 *
 * @param recipe - The Recipe instance
 * @param variant - The active variant name, or `undefined`/`*` for defaults
 * @returns A `RecipeChoices` with the `variant` set and auto-selected alternatives
 * @category Helpers
 *
 * @example
 * ```typescript
 * const recipe = new Recipe(cooklangText);
 * const choices = getEffectiveChoices(recipe, "vegan");
 * const ingredients = recipe.getIngredientQuantities({ choices });
 * ```
 */
export function getEffectiveChoices(
  recipe: Recipe,
  variant?: string,
): RecipeChoices {
  const choices: RecipeChoices = { variant };

  // No auto-selection for default variant
  if (variant === undefined || variant === "*") return choices;

  const variantLower = variant.toLowerCase();

  // Auto-select inline alternatives by note match
  for (const [itemId, alternatives] of recipe.choices.ingredientItems) {
    const matchIdx = alternatives.findIndex(
      (alt) => alt.note && alt.note.toLowerCase().includes(variantLower),
    );
    /* v8 ignore else -- @preserve: only act when there are matches */
    if (matchIdx >= 0) {
      /* v8 ignore else -- @preserve: initialization pattern */
      if (!choices.ingredientItems) choices.ingredientItems = new Map();
      choices.ingredientItems.set(itemId, matchIdx);
    }
  }

  // Auto-select grouped alternatives by note match
  for (const [groupId, subgroups] of recipe.choices.ingredientGroups) {
    const matchIdx = subgroups.findIndex((sg) =>
      sg.some(
        (alt) => alt.note && alt.note.toLowerCase().includes(variantLower),
      ),
    );
    /* v8 ignore else -- @preserve: only act when there are matches */
    if (matchIdx >= 0) {
      /* v8 ignore else -- @preserve: initialization pattern */
      if (!choices.ingredientGroups) choices.ingredientGroups = new Map();
      choices.ingredientGroups.set(groupId, matchIdx);
    }
  }

  return choices;
}
