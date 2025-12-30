import { describe, it, expect } from "vitest";
import { ShoppingCart } from "../src/classes/shopping_cart";
import { ShoppingList } from "../src/classes/shopping_list";
import { Recipe } from "../src/classes/recipe";
import { ProductCatalog } from "../src/classes/product_catalog";
import {
  NoProductCatalogForCartError,
  NoShoppingListForCartError,
} from "../src/errors";
import {
  recipeForShoppingList1,
  recipeForShoppingList2,
} from "./fixtures/recipes";

const productCatalog: ProductCatalog = new ProductCatalog();
productCatalog.products = [
  {
    id: "flour-80g",
    productName: "Flour (80g)",
    ingredientName: "flour",
    price: 25,
    size: { type: "fixed", value: { type: "decimal", decimal: 80 } },
    unit: "g",
  },
  {
    id: "flour-40g",
    productName: "Flour (40g)",
    ingredientName: "flour",
    price: 15,
    size: { type: "fixed", value: { type: "decimal", decimal: 40 } },
    unit: "g",
  },
  {
    id: "eggs-1",
    productName: "Single Egg",
    ingredientName: "eggs",
    price: 20,
    size: { type: "fixed", value: { type: "decimal", decimal: 1 } },
  },
  {
    id: "milk-1L",
    productName: "Milk (1L)",
    ingredientName: "milk",
    price: 30,
    size: { type: "fixed", value: { type: "decimal", decimal: 1 } },
    unit: "l",
  },
];

describe("initialisation", () => {
  it("should be initialized directly with the class constructor", () => {
    const shoppingList = new ShoppingList();
    shoppingList.add_recipe(new Recipe(recipeForShoppingList1));
    const shoppingCart = new ShoppingCart({
      catalog: productCatalog,
      list: shoppingList,
    });
    expect(shoppingCart.productCatalog).toBe(productCatalog);
    expect(shoppingCart.shoppingList).toBe(shoppingList);
  });

  it("should throw an error if no shopping list is set", () => {
    const shoppingCart = new ShoppingCart();
    shoppingCart.setProductCatalog(productCatalog);
    expect(() => shoppingCart.buildCart()).toThrow(NoShoppingListForCartError);
  });

  it("should throw an error if no product catalog is set", () => {
    const shoppingList = new ShoppingList();
    shoppingList.add_recipe(new Recipe(recipeForShoppingList1));
    const shoppingCart = new ShoppingCart();
    shoppingCart.setShoppingList(shoppingList);
    expect(() => shoppingCart.buildCart()).toThrow(
      NoProductCatalogForCartError,
    );
  });
});

describe("buildCart", () => {
  it("should handle ingredients with no matching products", () => {
    const shoppingCart = new ShoppingCart();
    const shoppingList = new ShoppingList();
    const recipe = new Recipe("@unknown-ingredient{1}");
    shoppingList.add_recipe(recipe);
    shoppingCart.setShoppingList(shoppingList);
    shoppingCart.setProductCatalog(productCatalog);
    shoppingCart.buildCart();

    expect(shoppingCart.cart).toEqual([]);
  });

  it("should handle ingredients with no quantity", () => {
    const shoppingCart = new ShoppingCart();
    const shoppingList = new ShoppingList();
    const recipe = new Recipe("@flour");
    shoppingList.add_recipe(recipe);
    shoppingCart.setShoppingList(shoppingList);
    shoppingCart.setProductCatalog(productCatalog);
    shoppingCart.buildCart();

    expect(shoppingCart.cart).toEqual([]);
  });

  it("should handle ingredients with text quantity", () => {
    const shoppingCart = new ShoppingCart();
    const shoppingList = new ShoppingList();
    const recipe = new Recipe("@flour{a bit}");
    shoppingList.add_recipe(recipe);
    shoppingCart.setShoppingList(shoppingList);
    shoppingCart.setProductCatalog(productCatalog);
    shoppingCart.buildCart();

    expect(shoppingCart.cart).toEqual([]);
  });

  it("should handle gracefully ingredient/products with for incompatible units", () => {
    const shoppingCart = new ShoppingCart();
    const shoppingList = new ShoppingList();
    const recipe = new Recipe("@flour{1%l}");
    shoppingList.add_recipe(recipe);
    shoppingCart.setShoppingList(shoppingList);
    shoppingCart.setProductCatalog(productCatalog);
    shoppingCart.buildCart();
    expect(shoppingCart.match.length).toBe(0);
    expect(shoppingCart.misMatch.length).toBe(1);
    expect(shoppingCart.misMatch[0]!.ingredient.name).toBe("flour");
    expect(shoppingCart.misMatch[0]!.reason).toBe("incompatibleUnits");

    const shoppingCart2 = new ShoppingCart();
    const shoppingList2 = new ShoppingList();
    const recipe2 = new Recipe("@eggs{2}");
    const productCatalog2: ProductCatalog = new ProductCatalog();
    productCatalog2.add({
      id: "eggs-1",
      productName: "Pack of 12 eggs",
      ingredientName: "eggs",
      price: 20,
      size: { type: "fixed", value: { type: "decimal", decimal: 1 } },
      unit: "dozen",
    });
    shoppingList2.add_recipe(recipe2);
    shoppingCart2.setShoppingList(shoppingList2);
    shoppingCart2.setProductCatalog(productCatalog2);
    shoppingCart2.buildCart();
    expect(shoppingCart2.match.length).toBe(0);
    expect(shoppingCart2.misMatch.length).toBe(1);
    expect(shoppingCart2.misMatch[0]!.ingredient.name).toBe("eggs");
    expect(shoppingCart2.misMatch[0]!.reason).toBe("incompatibleUnits");

    const shoppingCart3 = new ShoppingCart();
    const shoppingList3 = new ShoppingList();
    const recipe3 = new Recipe("@eggs{1%dozen}");
    const productCatalog3: ProductCatalog = new ProductCatalog();
    productCatalog3.add({
      id: "eggs-1",
      productName: "Single Egg",
      ingredientName: "eggs",
      price: 20,
      size: { type: "fixed", value: { type: "decimal", decimal: 1 } },
    });
    shoppingList3.add_recipe(recipe3);
    shoppingCart3.setShoppingList(shoppingList3);
    shoppingCart3.setProductCatalog(productCatalog3);
    shoppingCart3.buildCart();
    expect(shoppingCart3.match.length).toBe(0);
    expect(shoppingCart3.misMatch.length).toBe(1);
    expect(shoppingCart3.misMatch[0]!.ingredient.name).toBe("eggs");
    expect(shoppingCart3.misMatch[0]!.reason).toBe("incompatibleUnits");

    const shoppingCart4 = new ShoppingCart();
    const shoppingList4 = new ShoppingList();
    const recipe4 = new Recipe("@peeled tomatoes{2%cans}");
    const productCatalog4: ProductCatalog = new ProductCatalog();
    productCatalog4.add({
      id: "0123",
      productName: "Peeled Tomatoes",
      ingredientName: "peeled tomatoes",
      price: 20,
      size: { type: "fixed", value: { type: "decimal", decimal: 400 } },
      unit: "g",
    });
    shoppingList4.add_recipe(recipe4);
    shoppingCart4.setShoppingList(shoppingList4);
    shoppingCart4.setProductCatalog(productCatalog4);
    shoppingCart4.buildCart();
    expect(shoppingCart4.match.length).toBe(0);
    expect(shoppingCart4.misMatch.length).toBe(1);
    expect(shoppingCart4.misMatch[0]!.ingredient.name).toBe("peeled tomatoes");
    expect(shoppingCart4.misMatch[0]!.reason).toBe("incompatibleUnits");
  });

  it("should choose the cheapest option", () => {
    const shoppingCart = new ShoppingCart();
    const shoppingList = new ShoppingList();
    const recipe = new Recipe("@flour{600%g}");
    shoppingList.add_recipe(recipe);
    shoppingCart.setShoppingList(shoppingList);
    const catalog = new ProductCatalog();
    catalog.products = [
      {
        id: "flour-1kg",
        productName: "Flour (1kg)",
        ingredientName: "flour",
        price: 10,
        size: { type: "fixed", value: { type: "decimal", decimal: 1000 } },
        unit: "g",
      },
      {
        id: "flour-500g",
        productName: "Flour (500g)",
        ingredientName: "flour",
        price: 6,
        size: { type: "fixed", value: { type: "decimal", decimal: 500 } },
        unit: "g",
      },
    ];
    shoppingCart.setProductCatalog(catalog);
    shoppingCart.buildCart();

    // It should choose 1x 1kg pack (price 1) over 2x 500g packs (price 1.2)
    expect(shoppingCart.cart).toEqual([
      { product: catalog.products[0], quantity: 1, totalPrice: 10 }, // 1x 1kg
    ]);
  });

  it("should handle range quantities", () => {
    const shoppingCart = new ShoppingCart();
    const shoppingList = new ShoppingList();
    const recipe = new Recipe("Mix @flour{30-90%g} with @milk{80-120%cL}");
    shoppingList.add_recipe(recipe);
    shoppingCart.setShoppingList(shoppingList);
    shoppingCart.setProductCatalog(productCatalog);
    shoppingCart.buildCart();

    expect(shoppingCart.cart).toEqual([
      // Needs at least 30g of flour. 1 x 40g should be the solution
      { product: productCatalog.products[1], quantity: 1, totalPrice: 15 },
      // Needs at least 80cL of milk, 1 x 1L should be the solution
      { product: productCatalog.products[3], quantity: 1, totalPrice: 30 },
    ]);
  });

  it("should build a cart with one recipe", () => {
    const shoppingList = new ShoppingList();
    const shoppingCart = new ShoppingCart();
    shoppingList.add_recipe(new Recipe(recipeForShoppingList1));
    shoppingCart.setShoppingList(shoppingList);
    shoppingCart.setProductCatalog(productCatalog);
    shoppingCart.buildCart();

    expect(shoppingCart.cart).toEqual([
      { product: productCatalog.products[0], quantity: 1, totalPrice: 25 }, // 1x
      { product: productCatalog.products[1], quantity: 1, totalPrice: 15 }, // 1x
      { product: productCatalog.products[2], quantity: 2, totalPrice: 40 }, // 1x
      { product: productCatalog.products[3], quantity: 1, totalPrice: 30 }, // 1x
    ]);
    expect(shoppingCart.match.length).toBe(3);
    expect(shoppingCart.misMatch.length).toBe(3);
  });

  it("should build a cart with multiple recipes", () => {
    const shoppingCart = new ShoppingCart();
    const shoppingList = new ShoppingList();
    shoppingList.add_recipe(new Recipe(recipeForShoppingList1));
    shoppingList.add_recipe(new Recipe(recipeForShoppingList2));
    shoppingCart.setShoppingList(shoppingList);
    shoppingCart.setProductCatalog(productCatalog);
    shoppingCart.buildCart();

    expect(shoppingCart.cart).toEqual([
      { product: productCatalog.products[0], quantity: 2, totalPrice: 50 }, // 1x
      { product: productCatalog.products[2], quantity: 3, totalPrice: 60 }, // 1x
      { product: productCatalog.products[3], quantity: 1, totalPrice: 30 }, // 1x
    ]);
    expect(shoppingCart.match.length).toBe(3);
    expect(
      shoppingCart.misMatch.map((mismatch) => [
        mismatch.ingredient.name,
        mismatch.reason,
      ]),
    ).toEqual([
      // there's more reasons, but the first one that matches is captured
      ["sugar", "noProduct"],
      ["pepper", "noProduct"],
      ["spices", "noProduct"],
      ["butter", "noProduct"],
    ]);
  });
});
