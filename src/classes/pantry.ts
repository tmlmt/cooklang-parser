import {
  SingleDiagnosticError,
  DiagnosticError,
  InvalidPantryTomlError,
} from "../errors";
import { buildLineOffsets, makeSpan } from "../utils/diagnostics_spans";
import TOML from "smol-toml";
import type { TomlTable } from "smol-toml";
import type {
  PantryItem,
  PantryItemToml,
  PantryOptions,
  Diagnostic,
} from "../types";
import type { CategoryConfig } from "./category_config";
import {
  parseQuantityWithUnit,
  parseDateFromFormat,
  parseFuzzyDate,
} from "../utils/parser_helpers";
import { getNumericValue } from "../quantities/numeric";
import { normalizeUnit } from "../units/definitions";
import { normalizeKey } from "../utils/normalization";
import { getToBase } from "../units/conversion";

/**
 * Pantry Inventory Manager: parses and queries a pantry inventory file.
 *
 * ## Usage
 *
 * Create a new Pantry instance with optional TOML content and options
 * (see {@link Pantry."constructor" | constructor}), then query items
 * using {@link Pantry.getDepletedItems | getDepletedItems()},
 * {@link Pantry.getExpiredItems | getExpiredItems()},
 * {@link Pantry.isLow | isLow()}, or {@link Pantry.isExpired | isExpired()}.
 *
 * A Pantry can also be attached to a {@link ShoppingList} via
 * {@link ShoppingList.addPantry | addPantry()} so that on-hand stock
 * is subtracted from recipe ingredient needs.
 *
 * @example
 * ```typescript
 * import { Pantry } from "@tmlmt/cooklang-parser";
 *
 * const pantryToml = `
 * [fridge]
 * milk = { expire = "10.05.2024", quantity = "1%L" }
 *
 * [freezer]
 * spinach = { quantity = "1%kg", low = "200%g" }
 * `;
 *
 * const pantry = new Pantry(pantryToml);
 * console.log(pantry.getExpiredItems());
 * console.log(pantry.isLow("spinach"));
 * ```
 *
 * @see [Pantry Configuration](https://cooklang.org/docs/spec/#pantry-configuration) section of the cooklang specs
 *
 * @category Classes
 */
export class Pantry {
  /**
   * The parsed pantry items.
   */
  items: PantryItem[] = [];

  /** Diagnostics collected by the last {@link Pantry.parse | parse()}. */
  diagnostics: Diagnostic[] = [];

  /** Source text of the last parse; diagnostic spans refer to it. */
  source = "";

  /**
   * Options for date parsing and other configuration.
   */
  private options: PantryOptions;

  /**
   * Optional category configuration for alias-based lookups.
   */
  private categoryConfig?: CategoryConfig;

  /**
   * Creates a new Pantry instance.
   * @param tomlContent - Optional TOML content to parse.
   * @param options - Optional configuration options.
   */
  constructor(tomlContent?: string, options: PantryOptions = {}) {
    this.options = options;
    if (tomlContent) {
      this.parse(tomlContent);
    }
  }

  /**
   * Parses a TOML string into pantry items.
   *
   * All problems are collected in {@link Pantry.diagnostics}.
   *
   * @param tomlContent - The TOML string to parse.
   * @returns The parsed pantry items.
   * @throws {@link DiagnosticError} if a fatal (`COOKLANG_E9…`) diagnostic exists.
   */
  parse(tomlContent: string): PantryItem[] {
    this.source = tomlContent;
    this.diagnostics = this._parseAndCollect(tomlContent).map(
      (e) => e.diagnostic,
    );
    if (this.diagnostics.some((d) => d.code.startsWith("COOKLANG_E9"))) {
      throw new DiagnosticError(this.diagnostics, tomlContent);
    }
    return this.items;
  }

  private _parseAndCollect(tomlContent: string): SingleDiagnosticError[] {
    let raw: TomlTable;
    try {
      raw = TOML.parse(tomlContent);
    } catch (e) {
      const error = new InvalidPantryTomlError((e as Error).message);
      const { line, column } = e as { line: number; column: number };
      error.diagnostic.span = makeSpan(
        buildLineOffsets(tomlContent),
        line - 1,
        column - 1,
        1,
      );
      return [error];
    }

    // Reset internal state
    this.items = [];
    const errors: SingleDiagnosticError[] = [];

    for (const [location, locationData] of Object.entries(raw)) {
      const locationTable = locationData as TomlTable;

      for (const [itemName, itemData] of Object.entries(locationTable)) {
        try {
          this.items.push(
            this._parseItem(itemName, location, itemData as PantryItemToml),
          );
        } catch (e) {
          /* v8 ignore if -- @preserve: _parseItem only throws SingleDiagnosticError, rethrow is a safeguard */
          if (!(e instanceof SingleDiagnosticError)) throw e;
          errors.push(e);
        }
      }
    }

    return errors;
  }

  /**
   * Parses a single pantry item from its TOML representation.
   */
  private _parseItem(
    name: string,
    location: string,
    data: PantryItemToml,
  ): PantryItem {
    const item: PantryItem = { name, location };

    if (typeof data === "string") {
      // Simple quantity string, e.g. "500%g"
      const parsed = parseQuantityWithUnit(data);
      item.quantity = parsed.value;
      if (parsed.unit) item.unit = parsed.unit;
    } else {
      // Object with attributes
      if (data.quantity) {
        const parsed = parseQuantityWithUnit(data.quantity);
        item.quantity = parsed.value;
        if (parsed.unit) item.unit = parsed.unit;
      }
      if (data.low) {
        const parsed = parseQuantityWithUnit(data.low);
        item.low = parsed.value;
        if (parsed.unit) item.lowUnit = parsed.unit;
      }
      if (data.bought) {
        item.bought = this._parseDate(data.bought);
      }
      if (data.expire) {
        item.expire = this._parseDate(data.expire);
      }
    }

    return item;
  }

  /**
   * Parses a date string using the configured format or fuzzy detection.
   */
  private _parseDate(input: string): Date {
    if (this.options.dateFormat) {
      return parseDateFromFormat(input, this.options.dateFormat);
    }
    return parseFuzzyDate(input);
  }

  /**
   * Sets a category configuration for alias-based item lookups.
   * @param config - The category configuration to use.
   */
  setCategoryConfig(config: CategoryConfig): void {
    this.categoryConfig = config;
  }

  /**
   * Finds a pantry item by name, using exact match first, then alias lookup
   * via the stored CategoryConfig.
   * @param name - The name to search for.
   * @returns The matching pantry item, or undefined if not found.
   */
  findItem(name: string): PantryItem | undefined {
    const lowerName = normalizeKey(name);

    // Exact match (case-insensitive)
    const exact = this.items.find(
      (item) => normalizeKey(item.name) === lowerName,
    );
    if (exact) return exact;

    // Alias match via CategoryConfig
    if (this.categoryConfig) {
      // Find the canonical name for this alias
      for (const category of this.categoryConfig.categories) {
        for (const catIngredient of category.ingredients) {
          if (
            catIngredient.aliases.some(
              (alias) => normalizeKey(alias) === lowerName,
            )
          ) {
            // Found the category ingredient — now look for any of its aliases in the pantry
            const canonicalName = normalizeKey(catIngredient.name);
            const byCanonical = this.items.find(
              (item) => normalizeKey(item.name) === canonicalName,
            );
            if (byCanonical) return byCanonical;

            // Also try all other aliases
            for (const alias of catIngredient.aliases) {
              const byAlias = this.items.find(
                (item) => normalizeKey(item.name) === normalizeKey(alias),
              );
              if (byAlias) return byAlias;
            }
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Gets the numeric value of a pantry item's quantity, optionally converted to base units.
   * Returns undefined if the quantity has a text value or is not set.
   */
  private getItemNumericValue(
    quantity: PantryItem["quantity"],
    unit?: string,
  ): number | undefined {
    // v8 ignore if -- @preserve: defensive type guard
    if (!quantity) return undefined;

    let numericValue: number;
    if (quantity.type === "fixed") {
      if (quantity.value.type === "text") return undefined;
      numericValue = getNumericValue(quantity.value);
    } else {
      // Range: use the average (min + max) / 2
      numericValue =
        (getNumericValue(quantity.min) + getNumericValue(quantity.max)) / 2;
    }

    // Convert to base if unit is known
    if (unit) {
      const unitDef = normalizeUnit(unit);
      if (unitDef) {
        const toBase = getToBase(unitDef);
        numericValue *= toBase;
      }
    }

    return numericValue;
  }

  /**
   * Returns all items that are depleted (quantity = 0) or below their low threshold.
   * @returns An array of depleted pantry items.
   */
  getDepletedItems(): PantryItem[] {
    return this.items.filter((item) => this.isItemLow(item));
  }

  /**
   * Returns all items whose expiration date is within `nbDays` days from today
   * (or already passed).
   * @param nbDays - Number of days ahead to check. Defaults to 0 (already expired).
   * @returns An array of expired pantry items.
   */
  getExpiredItems(nbDays: number = 0): PantryItem[] {
    return this.items.filter((item) => this.isItemExpired(item, nbDays));
  }

  /**
   * Checks if a specific item is low (quantity = 0 or below `low` threshold).
   * @param itemName - The name of the item to check (supports aliases if CategoryConfig is set).
   * @returns true if the item is low, false otherwise. Returns false if item not found.
   */
  isLow(itemName: string): boolean {
    const item = this.findItem(itemName);
    if (!item) return false;
    return this.isItemLow(item);
  }

  /**
   * Checks if a specific item is expired or expires within `nbDays` days.
   * @param itemName - The name of the item to check (supports aliases if CategoryConfig is set).
   * @param nbDays - Number of days ahead to check. Defaults to 0.
   * @returns true if the item is expired, false otherwise. Returns false if item not found.
   */
  isExpired(itemName: string, nbDays: number = 0): boolean {
    const item = this.findItem(itemName);
    if (!item) return false;
    return this.isItemExpired(item, nbDays);
  }

  /**
   * Internal: checks if a pantry item is low.
   */
  private isItemLow(item: PantryItem): boolean {
    if (!item.quantity) return false;

    const qtyValue = this.getItemNumericValue(item.quantity, item.unit);
    if (qtyValue === undefined) return false;

    // Zero quantity
    if (qtyValue === 0) return true;

    // Below low threshold
    if (item.low) {
      const lowValue = this.getItemNumericValue(item.low, item.lowUnit);
      if (lowValue !== undefined && qtyValue <= lowValue) return true;
    }

    return false;
  }

  /**
   * Internal: checks if a pantry item is expired.
   */
  private isItemExpired(item: PantryItem, nbDays: number): boolean {
    if (!item.expire) return false;

    const now = new Date();
    const cutoff = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + nbDays,
    );
    const expireDay = new Date(
      item.expire.getFullYear(),
      item.expire.getMonth(),
      item.expire.getDate(),
    );

    return expireDay <= cutoff;
  }
}
