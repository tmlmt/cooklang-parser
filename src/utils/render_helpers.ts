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
  IngredientItemQuantity,
} from "../types";
import { Recipe } from "../classes/recipe";

// ============================================================================
// Quantity Formatting Helpers
// ============================================================================

/**
 * Format a numeric value (decimal or fraction) to a string.
 *
 * @param value - The decimal or fraction value to format
 * @returns The formatted string representation
 * @category Helpers
 *
 * @example
 * ```typescript
 * formatNumericValue({ type: "decimal", decimal: 1.5 }); // "1.5"
 * formatNumericValue({ type: "fraction", num: 1, den: 2 }); // "1/2"
 * ```
 */
export function formatNumericValue(
  value: DecimalValue | FractionValue,
): string {
  if (value.type === "decimal") {
    return String(value.decimal);
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
  itemQuantity: IngredientItemQuantity,
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
    // Get the alternatives array for this group
    const groupAlternatives = recipe.choices.ingredientGroups.get(item.group);
    if (
      groupAlternatives &&
      selectedIndex !== undefined &&
      selectedIndex < groupAlternatives.length
    ) {
      // Check if the selected alternative's itemId matches this item's id
      const selectedItemId = groupAlternatives[selectedIndex]?.itemId;
      return selectedItemId === item.id;
    }
    return false;
  }

  // Inline alternatives: check ingredientItems map
  const selectedIndex = choices?.ingredientItems?.get(item.id);
  return alternativeIndex === selectedIndex;
}
