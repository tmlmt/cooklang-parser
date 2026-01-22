import type {
  FixedValue,
  Range,
  TextValue,
  DecimalValue,
  FractionValue,
  Unit,
  QuantityWithExtendedUnit,
  IngredientItemQuantity,
} from "cooklang-parser";

/**
 * Composable for formatting quantities consistently across components
 */
export function useQuantityFormat() {
  /**
   * Format a numeric value (decimal or fraction)
   */
  function formatNumericValue(value: DecimalValue | FractionValue): string {
    if (value.type === "decimal") {
      return String(value.decimal);
    }
    return `${value.num}/${value.den}`;
  }

  /**
   * Format a single value (text, decimal, or fraction)
   */
  function formatSingleValue(
    value: TextValue | DecimalValue | FractionValue,
  ): string {
    if (value.type === "text") {
      return value.text;
    }
    return formatNumericValue(value);
  }

  /**
   * Format a quantity (fixed or range)
   */
  function formatQuantity(quantity: FixedValue | Range): string {
    if (quantity.type === "fixed") {
      return formatSingleValue(quantity.value);
    }
    // Range
    const minStr = formatNumericValue(quantity.min);
    const maxStr = formatNumericValue(quantity.max);
    return `${minStr}-${maxStr}`;
  }

  /**
   * Format a unit - handles both plain string and Unit object
   */
  function formatUnit(unit: string | Unit | undefined): string {
    if (!unit) return "";
    if (typeof unit === "string") return unit;
    return unit.name;
  }

  /**
   * Format a quantity with its unit
   */
  function formatQuantityWithUnit(
    quantity: FixedValue | Range | undefined,
    unit: string | Unit | undefined,
  ): string {
    if (!quantity) return "";
    const qty = formatQuantity(quantity);
    const unitStr = formatUnit(unit);
    return unitStr ? `${qty} ${unitStr}` : qty;
  }

  /**
   * Format a QuantityWithExtendedUnit (used in IngredientItemQuantity)
   */
  function formatExtendedQuantity(item: QuantityWithExtendedUnit): string {
    return formatQuantityWithUnit(item.quantity, item.unit);
  }

  /**
   * Format an IngredientItemQuantity with all its equivalents
   */
  function formatItemQuantity(itemQuantity: IngredientItemQuantity): string {
    const parts: string[] = [];

    // Primary quantity
    if (itemQuantity.quantity) {
      parts.push(formatExtendedQuantity(itemQuantity));
    }

    // Equivalents
    if (itemQuantity.equivalents) {
      for (const eq of itemQuantity.equivalents) {
        if (eq.quantity) {
          parts.push(formatExtendedQuantity(eq));
        }
      }
    }

    return parts.join(" | ") || "";
  }

  return {
    formatNumericValue,
    formatSingleValue,
    formatQuantity,
    formatUnit,
    formatQuantityWithUnit,
    formatExtendedQuantity,
    formatItemQuantity,
  };
}
