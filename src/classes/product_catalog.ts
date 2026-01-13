import TOML from "smol-toml";
import type {
  FixedNumericValue,
  ProductOption,
  ProductOptionToml,
  ProductSize,
} from "../types";
import type { TomlTable } from "smol-toml";
import {
  isPositiveIntegerString,
  parseQuantityInput,
  stringifyQuantityValue,
} from "../utils/parser_helpers";
import { InvalidProductCatalogFormat } from "../errors";

/**
 * Product Catalog Manager: used in conjunction with {@link ShoppingCart}
 *
 * ## Usage
 *
 * You can either directly populate the products by feeding the {@link ProductCatalog.products | products} property. Alternatively,
 * you can provide a catalog in TOML format to either the constructor itself or to the {@link ProductCatalog.parse | parse()} method.
 *
 * @category Classes
 *
 * @example
 * ```typescript
 * import { ProductCatalog } from "@tmlmt/cooklang-parser";
 *
 * const catalog = `
 * [eggs]
 * aliases = ["oeuf", "huevo"]
 * 01123 = { name = "Single Egg", size = "1", price = 2 }
 * 11244 = { name = "Pack of 6 eggs", size = "6", price = 10 }
 *
 * [flour]
 * aliases = ["farine", "Mehl"]
 * 01124 = { name = "Small pack", size = "100%g", price = 1.5 }
 * 14141 = { name = "Big pack", size = "6%kg", price = 10 }
 * `
 * const catalog = new ProductCatalog(catalog);
 * const eggs = catalog.find("oeuf");
 * ```
 */
export class ProductCatalog {
  public products: ProductOption[] = [];

  constructor(tomlContent?: string) {
    if (tomlContent) this.parse(tomlContent);
  }

  /**
   * Parses a TOML string into a list of product options.
   * @param tomlContent - The TOML string to parse.
   * @returns A parsed list of `ProductOption`.
   */
  public parse(tomlContent: string): ProductOption[] {
    const catalogRaw = TOML.parse(tomlContent);

    // Reset internal state
    this.products = [];

    if (!this.isValidTomlContent(catalogRaw)) {
      throw new InvalidProductCatalogFormat();
    }

    for (const [ingredientName, ingredientData] of Object.entries(catalogRaw)) {
      const ingredientTable = ingredientData as TomlTable;
      const aliases = ingredientTable.aliases as string[] | undefined;

      for (const [key, productData] of Object.entries(ingredientTable)) {
        if (key === "aliases") {
          continue;
        }

        const productId = key;
        const { name, size, price, ...rest } =
          productData as unknown as ProductOptionToml;

        // Handle size as string or string[]
        const sizeStrings = Array.isArray(size) ? size : [size];
        const sizes: ProductSize[] = sizeStrings.map((sizeStr) => {
          const sizeAndUnitRaw = sizeStr.split("%");
          const sizeParsed = parseQuantityInput(
            sizeAndUnitRaw[0]!,
          ) as FixedNumericValue;
          const productSize: ProductSize = { size: sizeParsed };
          if (sizeAndUnitRaw.length > 1) {
            productSize.unit = sizeAndUnitRaw[1]!;
          }
          return productSize;
        });

        const productOption: ProductOption = {
          id: productId,
          productName: name,
          ingredientName: ingredientName,
          price: price,
          sizes,
          ...rest,
        };
        if (aliases) {
          productOption.ingredientAliases = aliases;
        }

        this.products.push(productOption);
      }
    }

    return this.products;
  }

  /**
   * Stringifies the catalog to a TOML string.
   * @returns The TOML string representation of the catalog.
   */
  public stringify(): string {
    const grouped: Record<string, TomlTable> = {};

    for (const product of this.products) {
      const {
        id,
        ingredientName,
        ingredientAliases,
        sizes,
        productName,
        ...rest
      } = product;
      if (!grouped[ingredientName]) {
        grouped[ingredientName] = {};
      }
      if (ingredientAliases && !grouped[ingredientName].aliases) {
        grouped[ingredientName].aliases = ingredientAliases;
      }

      // Stringify each size as "value%unit" or just "value"
      const sizeStrings = sizes.map((s) =>
        s.unit
          ? `${stringifyQuantityValue(s.size)}%${s.unit}`
          : stringifyQuantityValue(s.size),
      );

      grouped[ingredientName][id] = {
        ...rest,
        name: productName,
        // Use array if multiple sizes, otherwise single string
        size: sizeStrings.length === 1 ? sizeStrings[0]! : sizeStrings,
      };
    }

    return TOML.stringify(grouped);
  }

  /**
   * Adds a product to the catalog.
   * @param productOption - The product to add.
   */
  public add(productOption: ProductOption): void {
    this.products.push(productOption);
  }

  /**
   * Removes a product from the catalog by its ID.
   * @param productId - The ID of the product to remove.
   */
  public remove(productId: string): void {
    this.products = this.products.filter((product) => product.id !== productId);
  }

  private isValidTomlContent(catalog: TomlTable): boolean {
    for (const productsRaw of Object.values(catalog)) {
      if (typeof productsRaw !== "object" || productsRaw === null) {
        return false;
      }

      for (const [id, obj] of Object.entries(productsRaw)) {
        if (id === "aliases") {
          if (!Array.isArray(obj)) {
            return false;
          }
        } else {
          if (!isPositiveIntegerString(id)) {
            return false;
          }
          if (typeof obj !== "object" || obj === null) {
            return false;
          }

          const record = obj as Record<string, unknown>;
          const keys = Object.keys(record);

          const mandatoryKeys = ["name", "size", "price"];

          if (mandatoryKeys.some((key) => !keys.includes(key))) {
            return false;
          }

          const hasProductName = typeof record.name === "string";
          // Size can be a string or an array of strings
          const hasSize =
            typeof record.size === "string" ||
            (Array.isArray(record.size) &&
              record.size.every((s) => typeof s === "string"));
          const hasPrice = typeof record.price === "number";

          if (!(hasProductName && hasSize && hasPrice)) {
            return false;
          }
        }
      }
    }

    return true;
  }
}
