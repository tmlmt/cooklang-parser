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
      size: { type: "fixed", value: { type: "decimal", decimal: 6 } },
    },
    {
      id: "01123",
      productName: "Single Egg",
      ingredientName: "eggs",
      price: 2,
      size: { type: "fixed", value: { type: "decimal", decimal: 1 } },
    },
    {
      id: "14141",
      productName: "Big pack",
      ingredientName: "flour",
      price: 10,
      size: { type: "fixed", value: { type: "decimal", decimal: 6 } },
      unit: "kg",
    },
    {
      id: "01124",
      productName: "Small pack",
      ingredientName: "flour",
      price: 1.5,
      size: { type: "fixed", value: { type: "decimal", decimal: 100 } },
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

    it("should parse a product catalog with valid aliases", () => {
      const catalog = new ProductCatalog();
      const products = catalog.parse(`[eggs]
aliases = ["oeuf", "huevo"]
01123 = { name = "Single Egg", size = "1", price = 2 }`);
      expect(products.length).toBe(1);
      expect(products).toEqual([
        {
          id: "01123",
          productName: "Single Egg",
          ingredientName: "eggs",
          ingredientAliases: ["oeuf", "huevo"],
          price: 2,
          size: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        },
      ]);
    });

    it("should parse a product catalog with additional metadata", () => {
      const catalog = new ProductCatalog();
      const products = catalog.parse(`[eggs]
01123 = { name = "Single Egg", size = "1", price = 2, image = "egg.png" }`);
      expect(products.length).toBe(1);
      expect(products).toEqual([
        {
          id: "01123",
          image: "egg.png",
          productName: "Single Egg",
          ingredientName: "eggs",
          price: 2,
          size: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        },
      ]);
    });

    it.each([
      // Ingredient value is not a table
      `eggs = "not a table"`,
      // Product is not an object
      `[eggs]
01123 = "not an object"`,
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
      // Invalid aliases definition
      `[eggs]
aliases = "not an array"`,
    ])(
      "should throw an error for an invalid product catalog",
      (tomlContent) => {
        expect(() => new ProductCatalog(tomlContent)).toThrow(
          InvalidProductCatalogFormat,
        );
      },
    );
  });

  describe("stringifying", () => {
    it("should stringify a valid product catalog", () => {
      const catalog = new ProductCatalog();
      catalog.products = exampleProductOptions;
      const stringified = catalog.stringify();
      expect(stringified).toBe(exampleTomlContentAlt);
    });

    it("should handle products with aliases", () => {
      const catalog = new ProductCatalog();
      catalog.products = [
        {
          id: "11244",
          productName: "Pack of 6 eggs",
          ingredientName: "eggs",
          ingredientAliases: ["oeuf", "huevo"],
          price: 10,
          size: { type: "fixed", value: { type: "decimal", decimal: 6 } },
        },
        {
          id: "01123",
          productName: "Single Egg",
          ingredientName: "eggs",
          ingredientAliases: ["oeuf", "huevo"],
          price: 2,
          size: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        },
      ];
      const stringified = catalog.stringify();
      expect(stringified).toBe(`[eggs]
aliases = [ "oeuf", "huevo" ]

[eggs.11244]
price = 10
name = "Pack of 6 eggs"
size = "6"

[eggs.01123]
price = 2
name = "Single Egg"
size = "1"
`);
    });

    it("should handle products with arbitrary metadata", () => {
      const catalog = new ProductCatalog();
      catalog.products = [
        {
          id: "11244",
          productName: "Pack of 6 eggs",
          ingredientName: "eggs",
          price: 10,
          size: { type: "fixed", value: { type: "decimal", decimal: 6 } },
          image: "egg.png",
        },
      ];
      const stringified = catalog.stringify();
      expect(stringified).toBe(`[eggs.11244]
price = 10
image = "egg.png"
name = "Pack of 6 eggs"
size = "6"
`);
    });
  });

  describe("adding", () => {
    it("should add a product to the catalog", () => {
      const catalog = new ProductCatalog();
      const newProduct: ProductOption = {
        id: "12345",
        productName: "New Product",
        ingredientName: "new-ingredient",
        size: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: "kg",
        price: 10,
      };
      catalog.add(newProduct);
      expect(catalog.products.length).toBe(1);
      expect(catalog.products[0]).toEqual(newProduct);
    });
  });

  describe("removing", () => {
    it("should remove a product from the catalog", () => {
      const catalog = new ProductCatalog(exampleTomlContent);
      catalog.remove("11244");
      expect(catalog.products.length).toBe(3);
      expect(catalog.products).not.toContainEqual({
        id: "11244",
        productName: "Pack of 6 eggs",
        ingredientName: "eggs",
        price: 10,
        size: { type: "fixed", value: { type: "decimal", decimal: 6 } },
      });
    });

    it("should do nothing if a product do not exist", () => {
      const catalog = new ProductCatalog(exampleTomlContent);
      catalog.remove("00000");
      expect(catalog.products.length).toBe(4);
      expect(catalog.products).toEqual(exampleProductOptions);
    });
  });

  describe("adding and removing with aliases", () => {
    it("should add and remove products with aliases", () => {
      const catalog = new ProductCatalog();
      const newProduct: ProductOption = {
        id: "12345",
        productName: "New Product",
        ingredientName: "new-ingredient",
        ingredientAliases: ["alias-1"],
        size: { type: "fixed", value: { type: "decimal", decimal: 1 } },
        unit: "kg",
        price: 10,
      };
      catalog.add(newProduct);
      catalog.remove("12345");
      expect(catalog.products.length).toBe(0);
    });
  });
});
