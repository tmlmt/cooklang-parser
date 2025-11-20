import type {
  ProductOption,
  ProductSelection,
  Ingredient,
  CartContent,
  CartMatch,
  CartMisMatch,
  FixedNumericValue,
  Range,
} from "../types";
import { ProductCatalog } from "./product_catalog";
import { ShoppingList } from "./shopping_list";
import {
  NoProductCatalogForCartError,
  NoShoppingListForCartError,
  NoProductMatchError,
} from "../errors";
import {
  multiplyQuantityValue,
  normalizeUnit,
  getNumericValue,
} from "../units";
import { solve, type Model } from "yalps";

/**
 * Options for the {@link ShoppingCart} constructor
 * @category Types
 */
export interface ShoppingCartOptions {
  /**
   * A product catalog to connect to the cart
   */
  catalog?: ProductCatalog;
  /**
   * A shopping list to connect to the cart
   */
  list?: ShoppingList;
}

/**
 * Key information about the {@link ShoppingCart}
 * @category Types
 */
export interface ShoppingCartSummary {
  /**
   * The total price of the cart
   */
  totalPrice: number;
  /**
   * The total number of items in the cart
   */
  totalItems: number;
}

/**
 * Shopping Cart Manager: a tool to find the best combination of products to buy to satisfy a shopping list.
 *
 * @example
 * ```ts
 * const shoppingList = new ShoppingList();
 * const recipe = new Recipe("@flour{600%g}");
 * shoppingList.add_recipe(recipe);
 *
 * const catalog = new ProductCatalog();
 * catalog.products = [
 *   {
 *     id: "flour-1kg",
 *     productName: "Flour (1kg)",
 *     ingredientName: "flour",
 *     price: 10,
 *     size: { type: "fixed", value: { type: "decimal", value: 1000 } },
 *     unit: "g",
 *   },
 *   {
 *     id: "flour-500g",
 *     productName: "Flour (500g)",
 *     ingredientName: "flour",
 *     price: 6,
 *     size: { type: "fixed", value: { type: "decimal", value: 500 } },
 *     unit: "g",
 *   },
 * ];
 *
 * const shoppingCart = new ShoppingCart({list: shoppingList, catalog}))
 * shoppingCart.buildCart();
 * ```
 *
 * @category Classes
 */
export class ShoppingCart {
  /**
   * The product catalog to use for matching products
   */
  productCatalog?: ProductCatalog;
  /**
   * The shopping list to build the cart from
   */
  shoppingList?: ShoppingList;
  /**
   * The content of the cart
   */
  cart: CartContent = [];
  /**
   * The ingredients that were successfully matched with products
   */
  match: CartMatch = [];
  /**
   * The ingredients that could not be matched with products
   */
  misMatch: CartMisMatch = [];
  /**
   * Key information about the shopping cart
   */
  summary: ShoppingCartSummary;

  /**
   * Creates a new ShoppingCart instance
   * @param options - {@link ShoppingCartOptions | Options} for the constructor
   */
  constructor(options?: ShoppingCartOptions) {
    if (options?.catalog) this.productCatalog = options.catalog;
    if (options?.list) this.shoppingList = options.list;
    this.summary = { totalPrice: 0, totalItems: 0 };
  }

  /**
   * Sets the product catalog to use for matching products
   * To use if a catalog was not provided at the creation of the instance
   * @param catalog - The {@link ProductCatalog} to set
   */
  setProductCatalog(catalog: ProductCatalog) {
    this.productCatalog = catalog;
  }

  /**
   * Sets the shopping list to build the cart from.
   * To use if a shopping list was not provided at the creation of the instance
   * @param list - The {@link ShoppingList} to set
   */
  setShoppingList(list: ShoppingList) {
    this.shoppingList = list;
  }

  /**
   * Builds the cart from the shopping list and product catalog
   * @remarks
   * - If a combination of product(s) is successfully found for a given ingredient, the latter will be listed in the {@link ShoppingCart.match | match} array
   * in addition to that combination being added to the {@link ShoppingCart.cart | cart}.
   * - Otherwise, the latter will be listed in the {@link ShoppingCart.misMatch | misMatch} array. Possible causes can be:
   *   - No product is listed in the catalog for that ingredient
   *   - The ingredient has no quantity, a text quantity
   *   - The ingredient's quantity unit is incompatible with the units of the candidate products listed in the catalog
   * @throws {@link NoProductCatalogForCartError} if no product catalog is set
   * @throws {@link NoShoppingListForCartError} if no shopping list is set
   * @returns `true` if all ingredients in the shopping list have been matched to products in the catalog, or `false` otherwise
   */
  buildCart(): boolean {
    this.resetCart();

    if (!this.productCatalog) {
      throw new NoProductCatalogForCartError();
    } else if (!this.shoppingList) {
      throw new NoShoppingListForCartError();
    }

    for (const ingredient of this.shoppingList.ingredients) {
      const productOptions = this.getProductOptions(ingredient);
      try {
        const optimumMatch = this.getOptimumMatch(ingredient, productOptions);
        this.cart.push(...optimumMatch);
        this.match.push({ ingredient, selection: optimumMatch });
      } catch (error) {
        /* v8 ignore else -- @preserve */
        if (error instanceof NoProductMatchError) {
          this.misMatch.push({ ingredient, reason: error.code });
        }
      }
    }

    this.summarize();

    return this.misMatch.length > 0;
  }

  /**
   * Gets the product options for a given ingredient
   * @param ingredient - The ingredient to get the product options for
   * @returns An array of {@link ProductOption}
   */
  private getProductOptions(ingredient: Ingredient): ProductOption[] {
    // this function is only called in buildCart() which starts by checking that a product catalog is present
    return this.productCatalog!.products.filter(
      (product) => product.ingredientName === ingredient.name,
    );
  }

  /**
   * Gets the optimum match for a given ingredient and product option
   * @param ingredient - The ingredient to match
   * @param options - The product options to choose from
   * @returns An array of {@link ProductSelection}
   * @throws {@link NoProductMatchError} if no match can be found
   */
  private getOptimumMatch(
    ingredient: Ingredient,
    options: ProductOption[],
  ): ProductSelection[] {
    // If there's no product option, return an empty match
    if (options.length === 0)
      throw new NoProductMatchError(ingredient.name, "noProduct");
    // If the ingredient has no quantity, we can't match any product
    if (!ingredient.quantity)
      throw new NoProductMatchError(ingredient.name, "noQuantity");
    // If the ingredient has a text quantity, we can't match any product
    if (
      ingredient.quantity.type === "fixed" &&
      ingredient.quantity.value.type === "text"
    )
      throw new NoProductMatchError(ingredient.name, "textValue");
    // Convert quantities to base
    if (!this.checkUnitCompatibility(ingredient, options)) {
      throw new NoProductMatchError(ingredient.name, "incompatibleUnits");
    }

    const normalizedOptions = options
      .map((option) => {
        return { ...option, unit: normalizeUnit(option.unit) };
      })
      .map((option) => {
        return {
          ...option,
          size: option.unit
            ? (multiplyQuantityValue(
                option.size,
                option.unit.toBase,
              ) as FixedNumericValue)
            : option.size,
        };
      });
    const normalizedIngredient = {
      ...ingredient,
      quantity: ingredient.quantity as FixedNumericValue | Range,
      unit: normalizeUnit(ingredient.unit),
    };
    if (normalizedIngredient.unit && normalizedIngredient.quantity)
      normalizedIngredient.quantity = multiplyQuantityValue(
        normalizedIngredient.quantity,
        normalizedIngredient.unit.toBase,
      ) as FixedNumericValue | Range;

    // Simple minimization exercise if only one product option
    if (normalizedOptions.length == 1) {
      // FixedValue
      if (normalizedIngredient.quantity.type === "fixed") {
        const resQuantity = Math.ceil(
          getNumericValue(normalizedIngredient.quantity.value) /
            getNumericValue(normalizedOptions[0]!.size.value),
        );
        return [
          {
            product: options[0]!,
            quantity: resQuantity,
            totalPrice: resQuantity * options[0]!.price,
          },
        ];
      }
      // Range
      else {
        const targetQuantity = normalizedIngredient.quantity.min;
        const resQuantity = Math.ceil(
          getNumericValue(targetQuantity) /
            getNumericValue(normalizedOptions[0]!.size.value),
        );
        return [
          {
            product: options[0]!,
            quantity: resQuantity,
            totalPrice: resQuantity * options[0]!.price,
          },
        ];
      }
    }

    // More complex problem if there are several options
    const model: Model = {
      direction: "minimize",
      objective: "price",
      integers: true,
      constraints: {
        size: {
          min:
            normalizedIngredient.quantity.type === "fixed"
              ? getNumericValue(normalizedIngredient.quantity.value)
              : getNumericValue(normalizedIngredient.quantity.min),
        },
      },
      variables: normalizedOptions.reduce(
        (acc, option) => {
          acc[option.id] = {
            price: option.price,
            size: getNumericValue(option.size.value),
          };
          return acc;
        },
        {} as Record<string, { price: number; size: number }>,
      ),
    };

    const solution = solve(model);
    return solution.variables.map((variable) => {
      const resProductSelection = {
        product: options.find((option) => option.id === variable[0])!,
        quantity: variable[1],
      };
      return {
        ...resProductSelection,
        totalPrice:
          resProductSelection.quantity * resProductSelection.product.price,
      };
    });
  }

  /**
   * Checks if the units of an ingredient and its product options are compatible
   * @param ingredient - The ingredient to check
   * @param options - The product options to check
   * @returns `true` if the units are compatible, `false` otherwise
   */
  private checkUnitCompatibility(
    ingredient: Ingredient,
    options: ProductOption[],
  ): boolean {
    if (options.every((option) => option.unit === ingredient.unit)) {
      return true;
    }
    if (!ingredient.unit && options.some((option) => option.unit)) {
      return false;
    }
    if (ingredient.unit && options.some((option) => !option.unit)) {
      return false;
    }

    const optionsUnits = options.map((options) => normalizeUnit(options.unit));
    const normalizedUnit = normalizeUnit(ingredient.unit);
    if (!normalizedUnit) {
      return false;
    }
    if (optionsUnits.some((unit) => unit?.type !== normalizedUnit?.type)) {
      return false;
    }
    return true;
  }

  /**
   * Reset the cart's properties
   */
  private resetCart() {
    this.cart = [];
    this.match = [];
    this.misMatch = [];
    this.summary = { totalPrice: 0, totalItems: 0 };
  }

  /**
   * Calculate the cart's key info and store it in the cart's {@link ShoppingCart.summary | summary} property.
   * This function is automatically invoked by {@link ShoppingCart.buildCart | buildCart() } method.
   * @returns the total price and number of items in the cart
   */
  summarize(): ShoppingCartSummary {
    this.summary.totalPrice = this.cart.reduce(
      (acc, item) => acc + item.totalPrice,
      0,
    );
    this.summary.totalItems = this.cart.length;
    return this.summary;
  }
}
