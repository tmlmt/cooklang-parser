import TOML from "smol-toml";
import type {
  FixedNumericValue,
  ProductOption,
  ProductOptionToml,
} from "../types";
import type { TomlTable } from "smol-toml";
import {
  isPositiveIntegerString,
  parseQuantityInput,
  stringifyQuantityValue,
} from "../parser_helpers";
import { InvalidProductCatalogFormat } from "../errors";

/**
 * Product Catalog Manager
 *
 * Used in conjunction with {@link ShoppingCart}
 * 
 * ## Usage
 *
 * You can either directly populate the products by feeding the {@link ProductCatalog.products | products} property, 
 * or you can provide a catalog in TOML format to either the constructor itself or to the {@link ProductCatalog.parse | parse()} method. 
 *
 * @category Classes
 * 
 * @example
 * ```typescript
 * import { ProductCatalog } from "@tmlmt/cooklang-parser";
 *
 * const catalog = `[eggs]
01123 = { name = "Single Egg", size = "1", price = 2 }
11244 = { name = "Pack of 6 eggs", size = "6", price = 10 }

[flour]
01124 = { name = "Small pack", size = "100%g", price = 1.5 }
14141 = { name = "Big pack", size = "6%kg", price = 10 }
 * `
 * const catalog = new ProductCatalog(catalog);
 * ```
 */
export class ProductCatalog {
  public products: ProductOption[] = [];

  constructor(tomlContent?: string) {
    if (tomlContent) this.products = this.parse(tomlContent);
  }

  /**
   * Parses a TOML string into a list of product options.
   * @param tomlContent - The TOML string to parse.
   * @returns A parsed list of `ProductOption`.
   */
  public parse(tomlContent: string): ProductOption[] {
    const catalogRaw = TOML.parse(tomlContent);

    if (!this.isValidTomlContent(catalogRaw)) {
      throw new InvalidProductCatalogFormat();
    }

    for (const [ingredientName, productsRaw] of Object.entries(catalogRaw)) {
      for (const [productId, productRaw] of Object.entries(productsRaw)) {
        const sizeAndUnitRaw = (productRaw as ProductOptionToml).size.split(
          "%",
        );
        const size = parseQuantityInput(
          sizeAndUnitRaw[0]!,
        ) as FixedNumericValue;

        const productOption: ProductOption = {
          id: productId,
          productName: (productRaw as ProductOptionToml).name,
          ingredientName: ingredientName,
          price: (productRaw as ProductOptionToml).price,
          size,
        };

        if (sizeAndUnitRaw.length > 1) {
          productOption.unit = sizeAndUnitRaw[1]!;
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
    const groupedProducts = this.products.reduce(
      (acc, item) => {
        const { id, ingredientName, size, unit, productName, ...product } =
          item;

        if (!acc[ingredientName]) {
          acc[ingredientName] = {};
        }

        acc[ingredientName][id] = {
          ...product,
          name: productName,
          size: unit
            ? `${stringifyQuantityValue(size)}%${unit}`
            : stringifyQuantityValue(size),
        };

        return acc;
      },
      {} as Record<string, Record<string, ProductOptionToml>>,
    );
    return TOML.stringify(groupedProducts);
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

  private isValidTomlContent(products: TomlTable): boolean {
    for (const [ingredientName, productsRaw] of Object.entries(products)) {
      if (typeof ingredientName !== "string") {
        return false;
      }

      for (const [id, obj] of Object.entries(productsRaw)) {
        if (!isPositiveIntegerString(id)) {
          return false;
        }
        if (typeof obj !== "object" || obj === null) {
          return false;
        }

        const record = obj as Record<string, unknown>;
        const keys = Object.keys(record);

        const allowedKeys = new Set(["name", "size", "price"]);

        if (keys.some((key) => !allowedKeys.has(key))) {
          return false;
        }

        const hasProductName = typeof record.name === "string";
        const hasSize = typeof record.size === "string";
        const hasPrice = typeof record.price === "number";

        if (!(hasProductName && hasSize && hasPrice)) {
          return false;
        }
      }
    }

    return true;
  }
}
