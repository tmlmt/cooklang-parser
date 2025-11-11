import { describe, it, expect } from "vitest";
import { ShoppingCart } from "../src/classes/shopping_cart";
import { ShoppingList } from "../src/classes/shopping_list";
import { Recipe } from "../src/classes/recipe";
import type { ProductCatalog } from "../src/types";
import {
  NoProductCatalogForCartError,
  NoShoppingListForCartError,
} from "../src/errors";
import {
  recipeForShoppingList1,
  recipeForShoppingList2,
} from "./fixtures/recipes";

const productCatalog: ProductCatalog = [
  {
    id: "flour-80g",
    productName: "Flour (80g)",
    ingredientName: "flour",
    price: 25,
    size: { type: "fixed", value: { type: "decimal", value: 80 } },
    unit: "g",
  },
  {
    id: "flour-40g",
    productName: "Flour (40g)",
    ingredientName: "flour",
    price: 15,
    size: { type: "fixed", value: { type: "decimal", value: 40 } },
    unit: "g",
  },
  {
    id: "eggs-1",
    productName: "Single Egg",
    ingredientName: "eggs",
    price: 20,
    size: { type: "fixed", value: { type: "decimal", value: 1 } },
  },
  {
    id: "milk-1L",
    productName: "Milk (1L)",
    ingredientName: "milk",
    price: 30,
    size: { type: "fixed", value: { type: "decimal", value: 1 } },
    unit: "l",
  },
];

describe("initialisation", () => {
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
  });

  it("should choose the cheapest option", () => {
    const shoppingCart = new ShoppingCart();
    const shoppingList = new ShoppingList();
    const recipe = new Recipe("@flour{600%g}");
    shoppingList.add_recipe(recipe);
    shoppingCart.setShoppingList(shoppingList);
    const catalog: ProductCatalog = [
      {
        id: "flour-1kg",
        productName: "Flour (1kg)",
        ingredientName: "flour",
        price: 1,
        size: { type: "fixed", value: { type: "decimal", value: 1000 } },
        unit: "g",
      },
      {
        id: "flour-500g",
        productName: "Flour (500g)",
        ingredientName: "flour",
        price: 0.6,
        size: { type: "fixed", value: { type: "decimal", value: 500 } },
        unit: "g",
      },
    ];
    shoppingCart.setProductCatalog(catalog);
    shoppingCart.buildCart();

    // It should choose 1x 1kg pack (price 1) over 2x 500g packs (price 1.2)
    // But the current implementation seems to be more complex, using yalps.
    // The result of the LP solver might be different.
    // With the current implementation, it will be [[ 'flour-1kg', 1 ]]
    // Let's check the result from the solver.
    // objective: minimize price
    // constraints: size >= 600
    // variables:
    //   flour-1kg: price=1, size=1000
    //   flour-500g: price=0.6, size=500
    // Solution should be to take one 'flour-1kg' as it satisfies the constraint and is cheaper than two 'flour-500g'.
    // But if we need exactly 600g, it might be different. The constraint is min: 600.
    // Let's trace:
    // 1 * flour-1kg -> price 1, size 1000. size > 600.
    // 1 * flour-500g -> price 0.6, size 500. size < 600. Not a solution.
    // 2 * flour-500g -> price 1.2, size 1000. size > 600.
    // The solver should choose the first one.
    // What if we need 400g?
    // 1 * flour-500g -> price 0.6, size 500. size > 400.
    // 1 * flour-1kg -> price 1, size 1000. size > 400.
    // Solver should choose flour-500g.

    // The current simple minimization for single product is just Math.ceil.
    // For multiple products, it uses yalps.
    // The test case for "should build a cart with one recipe" for flour (100g needed)
    // has options 1kg for 2.5 and 500g for 1.5.
    // It chooses 500g pack. Price per gram: 2.5/1000=0.0025, 1.5/500=0.003. 1kg is cheaper per gram.
    // The solver seems to be minimizing total price, not price per unit.
    // For 100g, we need one pack of either. 500g pack is 1.5, 1kg pack is 2.5. So it chooses 500g. Correct.

    // Back to this test case. Need 600g.
    // Options: 1kg for 1, 500g for 0.6.
    // To get 600g:
    // - 1x 1kg pack: price 1, size 1000.
    // - 2x 500g pack: price 1.2, size 1000.
    // The solver should choose 1x 1kg pack.
    expect(shoppingCart.cart).toEqual([
      { product: catalog[0], quantity: 1 }, // 1x 1kg
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
      { product: productCatalog[1], quantity: 1 },
      // Needs at least 80cL of milk, 1 x 1L should be the solution
      { product: productCatalog[3], quantity: 1 },
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
      { product: productCatalog[0], quantity: 1 }, // 1x
      { product: productCatalog[1], quantity: 1 }, // 1x
      { product: productCatalog[2], quantity: 2 }, // 1x
      { product: productCatalog[3], quantity: 1 }, // 1x
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
      { product: productCatalog[0], quantity: 2 }, // 1x
      { product: productCatalog[2], quantity: 3 }, // 1x
      { product: productCatalog[3], quantity: 1 }, // 1x
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
      ["pepper", "noProduct"],
    ]);
  });
});
