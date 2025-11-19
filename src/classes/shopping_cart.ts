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
 * Shopping Cart Manager
 *
 * @category Classes
 */
export class ShoppingCart {
  productCatalog?: ProductCatalog;
  shoppingList?: ShoppingList;
  cart: CartContent = [];
  match: CartMatch = [];
  misMatch: CartMisMatch = [];

  constructor(options?: { catalog?: ProductCatalog; list?: ShoppingList }) {
    if (options?.catalog) this.productCatalog = options.catalog;
    if (options?.list) this.shoppingList = options.list;
  }

  setProductCatalog(catalog: ProductCatalog) {
    this.productCatalog = catalog;
  }

  setShoppingList(list: ShoppingList) {
    this.shoppingList = list;
  }

  buildCart() {
    if (!this.productCatalog) {
      throw new NoProductCatalogForCartError();
    } else if (!this.shoppingList) {
      throw new NoShoppingListForCartError();
    }

    for (const ingredient of this.shoppingList.ingredients) {
      if (ingredient.flags?.includes("hidden")) continue;
      const productOptions = this.getProductOptions(ingredient);
      if (productOptions.length > 0) {
        try {
          const optimumMatch = this.getOptimumMatch(ingredient, productOptions);
          this.cart.push(...optimumMatch);
          this.match.push({ ingredient, selection: optimumMatch });
        } catch (error) {
          if (error instanceof NoProductMatchError) {
            this.misMatch.push({ ingredient, reason: error.code });
          }
        }
      } else {
        this.misMatch.push({ ingredient, reason: "noProduct" });
      }
    }
  }

  private getProductOptions(ingredient: Ingredient): ProductOption[] {
    return (
      this.productCatalog?.products.filter(
        (product) => product.ingredientName === ingredient.name,
      ) ?? []
    );
  }

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
      else if (normalizedIngredient.quantity.type === "range") {
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

  private checkUnitCompatibility(
    ingredient: Ingredient,
    options: ProductOption[],
  ) {
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
}
