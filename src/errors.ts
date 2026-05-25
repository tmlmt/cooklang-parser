import { IngredientFlag, CookwareFlag, NoProductMatchErrorCode } from "./types";

export class ReferencedItemCannotBeRedefinedError extends Error {
  constructor(
    item_type: "ingredient" | "cookware",
    item_name: string,
    new_modifier: IngredientFlag | CookwareFlag,
  ) {
    super(
      `The referenced ${item_type} "${item_name}" cannot be redefined as ${new_modifier}.
You can either remove the reference to create a new ${item_type} defined as ${new_modifier} or add the ${new_modifier} flag to the original definition of the ${item_type}`,
    );
    this.name = "ReferencedItemCannotBeRedefinedError";
  }
}

/**
 * Error thrown when trying to build a shopping cart without a product catalog
 * @category Errors
 */
export class NoProductCatalogForCartError extends Error {
  constructor() {
    super(
      `Cannot build a cart without a product catalog. Please set one using setProductCatalog()`,
    );
    this.name = "NoProductCatalogForCartError";
  }
}

/**
 * Error thrown when trying to build a shopping cart without a shopping list
 * @category Errors
 */
export class NoShoppingListForCartError extends Error {
  constructor() {
    super(
      `Cannot build a cart without a shopping list. Please set one using setShoppingList()`,
    );
    this.name = "NoShoppingListForCartError";
  }
}

export class NoProductMatchError extends Error {
  code: NoProductMatchErrorCode;

  constructor(item_name: string, code: NoProductMatchErrorCode) {
    const messageMap: Record<NoProductMatchErrorCode, string> = {
      incompatibleUnits: `The units of the products in the catalogue are incompatible with ingredient ${item_name} in the shopping list.`,
      noProduct: `No product was found linked to ingredient name ${item_name} in the shopping list`,
      textValue: `Ingredient ${item_name} has a text value as quantity and can therefore not be matched with any product in the catalogue.`,
      noQuantity: `Ingredient ${item_name} has no quantity and can therefore not be matched with any product in the catalogue.`,
      textValue_incompatibleUnits: `Multiple alternative quantities were provided for ingredient ${item_name} in the shopping list but they were either text values or no product in catalog were found to have compatible units`,
    };
    super(messageMap[code]);
    this.code = code;
    this.name = "NoProductMatchError";
  }
}

export class InvalidProductCatalogFormat extends Error {
  constructor() {
    super("Invalid product catalog format.");
    this.name = "InvalidProductCatalogFormat";
  }
}

export class CannotAddTextValueError extends Error {
  constructor() {
    super("Cannot add a quantity with a text value.");
    this.name = "CannotAddTextValueError";
  }
}

export class IncompatibleUnitsError extends Error {
  constructor(unit1: string, unit2: string) {
    super(
      `Cannot add quantities with incompatible or unknown units: ${unit1} and ${unit2}`,
    );
    this.name = "IncompatibleUnitsError";
  }
}

export class InvalidQuantityFormat extends Error {
  constructor(value: string, extra?: string) {
    super(
      `Invalid quantity format found in: ${value}${extra ? ` (${extra})` : ""}`,
    );
    this.name = "InvalidQuantityFormat";
  }
}

export class NoTabAsIndentError extends Error {
  constructor() {
    super(
      `Tabs are not allowed for indentation in metadata blocks. Please use spaces only.`,
    );
    this.name = "NoTabAsIndentError";
  }
}

export class BadIndentationError extends Error {
  constructor() {
    super(`Bad identation of a nested block. Please use spaces only.`);
    this.name = "BadIndentationError";
  }
}

/**
 * Error thrown when trying to access a recipe path that does not exist in the index.
 * @category Errors
 */
export class UnknownRecipePathError extends Error {
  constructor(path: string) {
    super(
      `Unknown recipe path: "${path}". It was not found in the loaded refs.`,
    );
    this.name = "UnknownRecipePathError";
  }
}
