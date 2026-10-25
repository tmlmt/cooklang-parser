import type {
  Diagnostic,
  IngredientFlag,
  CookwareFlag,
  NoProductMatchErrorCode,
} from "./types";
import { createDiagnostic } from "./diagnostics";

// ---------------------------------------------------------------------------
// Base class
// ---------------------------------------------------------------------------

/**
 * Base class of all errors thrown by the library. It carries one or more
 * {@link Diagnostic}s, each with a stable `code`, a `fix` suggestion and a
 * documentation link.
 *
 * `parse()` methods throw it directly, with every diagnostic collected during
 * the parse. All other errors are {@link SingleDiagnosticError}s.
 * @category Errors
 */
export class DiagnosticError extends Error {
  /** All diagnostics carried by this error (always at least one). */
  readonly diagnostics: Diagnostic[];
  /**
   * The original text used for parsing, when thrown by a `parse()` method.
   * Pass to {@link formatDiagnostic} for code-frame output.
   */
  readonly source?: string;

  constructor(diagnostics: Diagnostic[], source?: string, message?: string) {
    const errorCount = diagnostics.filter((d) => d.severity === "error").length;
    super(
      message ??
        `Parsing failed with ${errorCount} error${errorCount !== 1 ? "s" : ""}.`,
    );
    this.name = "DiagnosticError";
    this.diagnostics = [...diagnostics];
    this.source = source;
  }
}

/**
 * Thrown when parsing must stop immediately after encountering a diagnostic.
 * @category Errors
 */
export class ParseStoppedError extends DiagnosticError {
  /** The diagnostic that caused parsing to stop. */
  readonly diagnostic: Diagnostic;
  /** Indicates that the parser stopped before processing the full source. */
  readonly stoppedEarly = true;

  constructor(
    diagnostic: Diagnostic,
    source: string,
    diagnostics: Diagnostic[] = [diagnostic],
  ) {
    super(diagnostics, source, diagnostic.message);
    this.name = "ParseStoppedError";
    this.diagnostic = diagnostic;
  }
}

/**
 * Base class of errors that describe exactly one problem.
 * @category Errors
 */
export class SingleDiagnosticError extends DiagnosticError {
  /** The structured diagnostic describing this error. */
  readonly diagnostic: Diagnostic;
  /** Shortcut for `diagnostic.code`. */
  readonly code: Diagnostic["code"];

  constructor(diagnostic: Diagnostic) {
    super([diagnostic], undefined, diagnostic.message);
    this.name = "SingleDiagnosticError";
    this.diagnostic = diagnostic;
    this.code = diagnostic.code;
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
export class ReferencedIngredientNotFoundError extends SingleDiagnosticError {
  readonly ingredientName: string;
  constructor(ingredientName: string) {
    super(createDiagnostic("COOKLANG_E0201", { name: ingredientName }));
    this.name = "ReferencedIngredientNotFoundError";
    this.ingredientName = ingredientName;
  }
}

/**
 * Thrown when a referenced cookware (`&`) cannot be found in the
 * cookware list declared earlier in the recipe.
 * @category Errors
 */
export class ReferencedCookwareNotFoundError extends SingleDiagnosticError {
  readonly cookwareName: string;
  constructor(cookwareName: string) {
    super(createDiagnostic("COOKLANG_E0202", { name: cookwareName }));
    this.name = "ReferencedCookwareNotFoundError";
    this.cookwareName = cookwareName;
  }
}

/**
 * Thrown when a referenced ingredient or cookware (`&`) is redefined with a different flag than the original definition.
 * @category Errors
 */
export class ReferencedItemCannotBeRedefinedError extends SingleDiagnosticError {
  readonly itemType: "ingredient" | "cookware";
  readonly itemName: string;
  readonly modifier: IngredientFlag | CookwareFlag;

  constructor(
    item_type: "ingredient" | "cookware",
    item_name: string,
    new_modifier: IngredientFlag | CookwareFlag,
  ) {
    super(
      createDiagnostic("COOKLANG_E0203", {
        itemType: item_type,
        name: item_name,
        flag: new_modifier,
      }),
    );
    this.name = "ReferencedItemCannotBeRedefinedError";
    this.itemType = item_type;
    this.itemName = item_name;
    this.modifier = new_modifier;
  }
}

/**
 * Thrown when a quantity is found to be in an invalid format
 * @category Errors
 */
export class InvalidQuantityFormat extends SingleDiagnosticError {
  readonly value: string;

  constructor(value: string, extra?: string) {
    super(createDiagnostic("COOKLANG_E0101", { value, extra }));
    this.name = "InvalidQuantityFormat";
    this.value = value;
  }
}

/**
 * Thrown when a fraction has a zero denominator.
 * @category Errors
 */
export class DivisionByZeroError extends SingleDiagnosticError {
  readonly fraction: string;

  constructor(fraction: string) {
    super(createDiagnostic("COOKLANG_E9403", {}));
    this.name = "DivisionByZeroError";
    this.fraction = fraction;
  }
}

/**
 * Thrown when tabs are used to indent a metadata block instead of spaces.
 * @category Errors
 */
export class NoTabAsIndentError extends SingleDiagnosticError {
  readonly sourceLine?: string;
  readonly column?: number;
  readonly length?: number;

  constructor(sourceLine?: string, column?: number, length?: number) {
    super(createDiagnostic("COOKLANG_E0301", {}));
    this.name = "NoTabAsIndentError";
    this.sourceLine = sourceLine;
    this.column = column;
    this.length = length;
  }
}

/**
 * Thrown when when a line in a nested block has inconsistent indentation (not the same as base or greater for children)
 * @category Errors
 */
export class BadIndentationError extends SingleDiagnosticError {
  readonly sourceLine?: string;
  readonly column?: number;
  readonly length?: number;

  constructor(sourceLine?: string, column?: number, length?: number) {
    super(createDiagnostic("COOKLANG_E0302", {}));
    this.name = "BadIndentationError";
    this.sourceLine = sourceLine;
    this.column = column;
    this.length = length;
  }
}

// ---------------------------------------------------------------------------
// Quantity / unit errors
// ---------------------------------------------------------------------------

/**
 * Thrown when a quantity with a text value is attempted to be added to another quantity
 * @category Errors
 */
export class CannotAddTextValueError extends SingleDiagnosticError {
  constructor() {
    super(createDiagnostic("COOKLANG_E9401", {}));
    this.name = "CannotAddTextValueError";
  }
}

/**
 * Thrown when two quantities with incompatible or unknown units are attempted
 * to be added together. This is an internal invariant: every public call site
 * that merges quantities pre-filters by compatible unit type before calling
 * into quantity arithmetic, so this should not be reachable from normal usage.
 * @category Errors
 */
export class IncompatibleUnitsError extends SingleDiagnosticError {
  constructor(unit1: string, unit2: string) {
    super(createDiagnostic("COOKLANG_I0401", { unit1, unit2 }));
    this.name = "IncompatibleUnitsError";
  }
}

/**
 * Thrown when the ratio between two quantities cannot be computed
 * because one of them is not numeric.
 * @category Errors
 */
export class RatioNotComputableError extends SingleDiagnosticError {
  constructor() {
    super(createDiagnostic("COOKLANG_E9402", {}));
    this.name = "RatioNotComputableError";
  }
}

// ---------------------------------------------------------------------------
// Shopping-list usage errors
// ---------------------------------------------------------------------------

/**
 * Thrown when a recipe is added to a ShoppingList that has unresolved
 * ingredient alternatives (no choices provided for them).
 * @category Errors
 */
export class UnresolvedAlternativesError extends SingleDiagnosticError {
  constructor(detail: string) {
    super(createDiagnostic("COOKLANG_E9501", { detail }));
    this.name = "UnresolvedAlternativesError";
  }
}

/**
 * Thrown when an index is out of bounds in a ShoppingList operation.
 * @category Errors
 */
export class IndexOutOfBoundsError extends SingleDiagnosticError {
  constructor() {
    super(createDiagnostic("COOKLANG_E9502", {}));
    this.name = "IndexOutOfBoundsError";
  }
}

/**
 * Error thrown when trying to access a recipe path that does not exist in the index.
 * @category Errors
 */
export class UnknownRecipePathError extends SingleDiagnosticError {
  constructor(path: string) {
    super(createDiagnostic("COOKLANG_E9503", { path }));
    this.name = "UnknownRecipePathError";
  }
}

/**
 * Thrown when something other than a Pantry or a TOML string is passed as pantry.
 * @category Errors
 */
export class InvalidPantryError extends SingleDiagnosticError {
  constructor() {
    super(createDiagnostic("COOKLANG_E9504", {}));
    this.name = "InvalidPantryError";
  }
}

/**
 * Thrown when something other than a CategoryConfig or a string is passed as category configuration.
 * @category Errors
 */
export class InvalidCategoryConfigError extends SingleDiagnosticError {
  constructor() {
    super(createDiagnostic("COOKLANG_E9505", {}));
    this.name = "InvalidCategoryConfigError";
  }
}

// ---------------------------------------------------------------------------
// Shopping-cart and product-catalog errors
// ---------------------------------------------------------------------------

/**
 * Error thrown when trying to build a shopping cart without a product catalog
 * @category Errors
 */
export class NoProductCatalogForCartError extends SingleDiagnosticError {
  constructor() {
    super(createDiagnostic("COOKLANG_E9603", {}));
    this.name = "NoProductCatalogForCartError";
  }
}

/**
 * Error thrown when trying to build a shopping cart without a shopping list
 * @category Errors
 */
export class NoShoppingListForCartError extends SingleDiagnosticError {
  constructor() {
    super(createDiagnostic("COOKLANG_E9604", {}));
    this.name = "NoShoppingListForCartError";
  }
}

/**
 * Error thrown when an ingredient of the shopping list cannot be matched to a product.
 * @category Errors
 */
export class NoProductMatchError extends SingleDiagnosticError {
  /** Reason why no product could be matched */
  readonly reason: NoProductMatchErrorCode;

  constructor(item_name: string, reason: NoProductMatchErrorCode) {
    const messageMap: Record<NoProductMatchErrorCode, string> = {
      incompatibleUnits: `The units of the products in the catalogue are incompatible with ingredient ${item_name} in the shopping list.`,
      noProduct: `No product was found linked to ingredient name ${item_name} in the shopping list`,
      textValue: `Ingredient ${item_name} has a text value as quantity and can therefore not be matched with any product in the catalogue.`,
      noQuantity: `Ingredient ${item_name} has no quantity and can therefore not be matched with any product in the catalogue.`,
      textValue_incompatibleUnits: `Multiple alternative quantities were provided for ingredient ${item_name} in the shopping list but they were either text values or no product in catalog were found to have compatible units`,
    };
    super(createDiagnostic("COOKLANG_W0601", { message: messageMap[reason] }));
    this.reason = reason;
    this.name = "NoProductMatchError";
  }
}

/**
 * Thrown when a product catalog is invalid (e.g. not a valid TOML file)
 * @category Errors
 */
export class InvalidProductCatalogFormat extends SingleDiagnosticError {
  constructor() {
    super(createDiagnostic("COOKLANG_E9602", {}));
    this.name = "InvalidProductCatalogFormat";
  }
}

/**
 * Thrown when the TOML syntax of a product catalog is invalid.
 * @category Errors
 */
export class InvalidProductCatalogTomlError extends SingleDiagnosticError {
  constructor(detail: string) {
    super(createDiagnostic("COOKLANG_E9601", { detail }));
    this.name = "InvalidProductCatalogTomlError";
  }
}

// ---------------------------------------------------------------------------
// Category-config and pantry errors
// ---------------------------------------------------------------------------

/**
 * Thrown when a category name is declared more than once in a CategoryConfig.
 * @category Errors
 */
export class DuplicateCategoryError extends SingleDiagnosticError {
  readonly categoryName: string;
  constructor(categoryName: string) {
    super(createDiagnostic("COOKLANG_E0702", { name: categoryName }));
    this.name = "DuplicateCategoryError";
    this.categoryName = categoryName;
  }
}

/**
 * Thrown when an ingredient line is encountered before any category header
 * in a CategoryConfig.
 * @category Errors
 */
export class IngredientWithoutCategoryError extends SingleDiagnosticError {
  readonly ingredientLine: string;
  constructor(ingredientLine: string) {
    super(createDiagnostic("COOKLANG_W0701", { line: ingredientLine }));
    this.name = "IngredientWithoutCategoryError";
    this.ingredientLine = ingredientLine;
  }
}

/**
 * Thrown when the same ingredient name or alias appears more than once in a
 * CategoryConfig.
 * @category Errors
 */
export class DuplicateIngredientAliasError extends SingleDiagnosticError {
  readonly alias: string;
  constructor(alias: string) {
    super(createDiagnostic("COOKLANG_W0702", { alias }));
    this.name = "DuplicateIngredientAliasError";
    this.alias = alias;
  }
}

/**
 * Thrown when a date of a pantry cannot be parsed.
 * @category Errors
 */
export class InvalidDateError extends SingleDiagnosticError {
  constructor(detail: string) {
    super(createDiagnostic("COOKLANG_E0701", { detail }));
    this.name = "InvalidDateError";
  }
}

/**
 * Thrown when the TOML syntax of a pantry is invalid.
 * @category Errors
 */
export class InvalidPantryTomlError extends SingleDiagnosticError {
  constructor(detail: string) {
    super(createDiagnostic("COOKLANG_E9701", { detail }));
    this.name = "InvalidPantryTomlError";
  }
}
