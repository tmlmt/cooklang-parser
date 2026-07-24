import type {
  CooklangParseDiagnostic,
  IngredientFlag,
  CookwareFlag,
  NoProductMatchErrorCode,
} from "./types";

// ---------------------------------------------------------------------------
// Parse-time aggregate error
// ---------------------------------------------------------------------------

/**
 * Thrown by {@link Recipe.parseOrThrow} when at least one error-severity
 * diagnostic was collected during parsing.
 * @category Errors
 */
export class CooklangParseError extends Error {
  /** All diagnostics collected during the failed parse. */
  readonly diagnostics: CooklangParseDiagnostic[];
  /**
   * The cleaned recipe body text used for parsing.
   * Pass to {@link formatDiagnostic} for code-frame output.
   */
  readonly source: string;

  constructor(diagnostics: CooklangParseDiagnostic[], source: string) {
    const errorCount = diagnostics.filter((d) => d.severity === "error").length;
    super(
      `Recipe parsing failed with ${errorCount} error${errorCount !== 1 ? "s" : ""}.`,
    );
    this.name = "CooklangParseError";
    this.diagnostics = diagnostics;
    this.source = source;
  }
}

// ---------------------------------------------------------------------------
// Internal invariant error (bucket 3)
// ---------------------------------------------------------------------------

/**
 * Thrown when an internal invariant is violated — this indicates a bug in
 * the library, not a problem with user input.
 * @category Errors
 */
export class InternalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InternalError";
  }
}

// ---------------------------------------------------------------------------
// Parse-time typed errors (used by parser_helpers; caught in recipe.ts)
// ---------------------------------------------------------------------------

/**
 * Thrown when a referenced ingredient (`&`) cannot be found in the
 * ingredient list declared earlier in the recipe.
 * @category Errors
 */
export class ReferencedIngredientNotFoundError extends Error {
  readonly ingredientName: string;
  constructor(ingredientName: string) {
    super(
      `Referenced ingredient "${ingredientName}" not found. A referenced ingredient must be declared before being referenced with '&'.`,
    );
    this.name = "ReferencedIngredientNotFoundError";
    this.ingredientName = ingredientName;
  }
}

/**
 * Thrown when a referenced cookware (`&`) cannot be found in the
 * cookware list declared earlier in the recipe.
 * @category Errors
 */
export class ReferencedCookwareNotFoundError extends Error {
  readonly cookwareName: string;
  constructor(cookwareName: string) {
    super(
      `Referenced cookware "${cookwareName}" not found. A referenced cookware must be declared before being referenced with '&'.`,
    );
    this.name = "ReferencedCookwareNotFoundError";
    this.cookwareName = cookwareName;
  }
}

/**
 * Thrown when a referenced ingredient or cookware (`&`) is redefined with a different flag than the original definition.
 * @category Errors
 */
export class ReferencedItemCannotBeRedefinedError extends Error {
  readonly itemType: "ingredient" | "cookware";
  readonly itemName: string;
  readonly modifier: IngredientFlag | CookwareFlag;

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
    this.itemType = item_type;
    this.itemName = item_name;
    this.modifier = new_modifier;
  }
}

// ---------------------------------------------------------------------------
// Shopping-cart errors
// ---------------------------------------------------------------------------

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

/**
 * Thrown when a product catalog is invalid (e.g. not a valid TOML file)
 * @category Errors
 */
export class InvalidProductCatalogFormat extends Error {
  constructor() {
    super("Invalid product catalog format.");
    this.name = "InvalidProductCatalogFormat";
  }
}

/**
 * Thrown when a quantity with a text value is attempted to be added to another quantity
 * @category Errors
 */
export class CannotAddTextValueError extends Error {
  constructor() {
    super("Cannot add a quantity with a text value.");
    this.name = "CannotAddTextValueError";
  }
}

/**
 * Thrown when two quantities with incompatible or unknown units are attempted to be added together
 * @category Errors
 */
export class IncompatibleUnitsError extends Error {
  constructor(unit1: string, unit2: string) {
    super(
      `Cannot add quantities with incompatible or unknown units: ${unit1} and ${unit2}`,
    );
    this.name = "IncompatibleUnitsError";
  }
}

/**
 * Thrown when a quantity is found to be in an invalid format
 * @category Errors
 */
export class InvalidQuantityFormat extends Error {
  constructor(value: string, extra?: string) {
    super(
      `Invalid quantity format found in: ${value}${extra ? ` (${extra})` : ""}`,
    );
    this.name = "InvalidQuantityFormat";
  }
}

/**
 * Thrown when tabs are used to indent a metadata block instead of spaces.
 * @category Errors
 */
export class NoTabAsIndentError extends Error {
  constructor() {
    super(
      `Tabs are not allowed for indentation in metadata blocks. Please use spaces only.`,
    );
    this.name = "NoTabAsIndentError";
  }
}

/**
 * Thrown when when a line in a nested block has inconsistent indentation (not the same as base or greater for children)
 * @category Errors
 */
export class BadIndentationError extends Error {
  constructor() {
    super(`Bad indentation of a nested block. Please use spaces only.`);
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

// ---------------------------------------------------------------------------
// Category-config usage errors (bucket 2)
// ---------------------------------------------------------------------------

/**
 * Thrown when a category name is declared more than once in a CategoryConfig.
 * @category Errors
 */
export class DuplicateCategoryError extends Error {
  readonly categoryName: string;
  constructor(categoryName: string) {
    super(`Duplicate category found: ${categoryName}`);
    this.name = "DuplicateCategoryError";
    this.categoryName = categoryName;
  }
}

/**
 * Thrown when an ingredient line is encountered before any category header
 * in a CategoryConfig.
 * @category Errors
 */
export class IngredientWithoutCategoryError extends Error {
  readonly ingredientLine: string;
  constructor(ingredientLine: string) {
    super(`Ingredient found without a category: ${ingredientLine}`);
    this.name = "IngredientWithoutCategoryError";
    this.ingredientLine = ingredientLine;
  }
}

/**
 * Thrown when the same ingredient name or alias appears more than once in a
 * CategoryConfig.
 * @category Errors
 */
export class DuplicateIngredientAliasError extends Error {
  readonly alias: string;
  constructor(alias: string) {
    super(`Duplicate ingredient/alias found: ${alias}`);
    this.name = "DuplicateIngredientAliasError";
    this.alias = alias;
  }
}

// ---------------------------------------------------------------------------
// Shopping-list usage errors (bucket 2)
// ---------------------------------------------------------------------------

/**
 * Thrown when an index is out of bounds in a ShoppingList operation.
 * @category Errors
 */
export class IndexOutOfBoundsError extends Error {
  constructor() {
    super("Index out of bounds");
    this.name = "IndexOutOfBoundsError";
  }
}

/**
 * Thrown when a recipe is added to a ShoppingList that has unresolved
 * ingredient alternatives (no choices provided for them).
 * @category Errors
 */
export class UnresolvedAlternativesError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "UnresolvedAlternativesError";
  }
}
