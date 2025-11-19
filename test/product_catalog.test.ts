import { describe, it, expect } from "vitest";
import { ProductCatalog } from "../src/classes/product_catalog";
import { InvalidProductCatalogFormat } from "../src/errors";
import { ProductOption } from "../src";

describe("ProductCatalog", () => {
  const exampleTomlContent = `[eggs]
01123 = { name = "Single Egg", size = "1", price = 2 }
11244 = { name = "Pack of 6 eggs", size = "6", price = 10 }

[flour]
01124 = { name = "Small pack", size = "100%g", price = 1.5 }
14141 = { name = "Big pack", size = "6%kg", price = 10 }`;

  const exampleTomlContentAlt = `[eggs.11244]
price = 10
name = "Pack of 6 eggs"
size = "6"

[eggs.01123]
price = 2
name = "Single Egg"
size = "1"

[flour.14141]
price = 10
name = "Big pack"
size = "6%kg"

[flour.01124]
price = 1.5
name = "Small pack"
size = "100%g"
`;

  const exampleProductOptions: ProductOption[] = [
    {
      id: "11244",
      productName: "Pack of 6 eggs",
      ingredientName: "eggs",
      price: 10,
      size: { type: "fixed", value: { type: "decimal", value: 6 } },
    },
    {
      id: "01123",
      productName: "Single Egg",
      ingredientName: "eggs",
      price: 2,
      size: { type: "fixed", value: { type: "decimal", value: 1 } },
    },
    {
      id: "14141",
      productName: "Big pack",
      ingredientName: "flour",
      price: 10,
      size: { type: "fixed", value: { type: "decimal", value: 6 } },
      unit: "kg",
    },
    {
      id: "01124",
      productName: "Small pack",
      ingredientName: "flour",
      price: 1.5,
      size: { type: "fixed", value: { type: "decimal", value: 100 } },
      unit: "g",
    },
  ];

  describe("parsing", () => {
    it("should parse a valid product catalog", () => {
      const catalog = new ProductCatalog();
      const products = catalog.parse(exampleTomlContent);
      expect(products.length).toBe(4);
      expect(products).toEqual(exampleProductOptions);
    });

    it("should parse the same valid product catalog presented in dotted format", () => {
      const catalog = new ProductCatalog();
      const products = catalog.parse(exampleTomlContentAlt);
      expect(products.length).toBe(4);
      expect(products).toEqual(exampleProductOptions);
    });

    it("should throw an error for an invalid product catalog", () => {
      const tomlContentArray = [
        // No price
        `[eggs]
01123 = { name = "Single Egg", size = "1" }`,
        // No size
        `[eggs]
Text = { name = "Single Egg", size = "1", price = 2 }`,
        // No ingredient name
        `
01234 = { name = "Single Egg", size = "1", price = 2 }`,
        // No product name
        `[eggs]
01234 = { size = "1", price = 2 }`,
        // Non numerical price
        `[flour]
01234 = { name = "Single Pack", size = "100%g", price = "2" }`,
        // Non authorized key
        `[flour]
01234 = { name = "Single Pack", size = "100%g", price = 2, some-other-key = "yo" }`,
      ];
      for (const tomlContent of tomlContentArray) {
        expect(() => new ProductCatalog(tomlContent)).toThrow(
          InvalidProductCatalogFormat,
        );
      }
    });
  });

  describe("stringifying", () => {
    it("should stringify a valid product catalog", () => {
      const catalog = new ProductCatalog();
      catalog.products = exampleProductOptions;
      const stringified = catalog.stringify();
      expect(stringified).toBe(exampleTomlContentAlt);
    });
  });
});
