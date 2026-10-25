/**
 * Nostics-backed diagnostic catalog for parse-time errors.
 *
 * Each exported factory function creates a {@link Diagnostic} for a
 * specific parse-time problem. They are the only place where diagnostic
 * codes are defined; keep them here and nowhere else.
 *
 * No reporters are configured — this is a library, so nothing is ever
 * auto-printed to the console.
 */
import { defineDiagnostics } from "nostics";
import type {
  DiagnosticCode,
  Diagnostic,
  DiagnosticSeverity,
  DiagnosticSourceSpan,
} from "./types";

/**
 * Catalog (nostics provides typed params + docs URL generation)
 *
 * Code format: `COOKLANG_<L><T><D><NN>` where `L` is the letter (E = error,
 * W = warning, I = internal/library bug), `T` the tier digit for `E` codes
 * (0 = non-fatal: caught and collected alongside other diagnostics, parsing
 * continues to report everything found; 9 = fatal: thrown immediately,
 * bypassing collection, so no other diagnostics are reported for that call).
 * `T` is always `0` for `W` and `I` (warnings are never fatal; internal
 * errors are always thrown immediately like fatal errors, but represent a
 * library bug rather than a legitimate problem with the input). `D` is the
 * domain digit (0 generic/internal, 1 syntax, 2 references, 3 metadata,
 * 4 quantities and units, 5 shopping list, 6 cart/product catalog,
 * 7 pantry/category configuration) and `NN` a 2-digit sequence number.
 * Every code needs a page in docs/e/codes/.
 *
 * @hidden
 * @category Diagnostics
 */
export const diagnosticCatalog = defineDiagnostics({
  docsBase: (code) =>
    `https://cooklang-parser.tmlmt.com/v3/e/${code.toLowerCase()}`,
  codes: {
    // -- Domain 1: syntax --------------------------------------------------
    COOKLANG_E0101: {
      why: (p: { value: string; extra?: string }) =>
        `Invalid quantity format: "${p.value}"${p.extra ? ` (${p.extra})` : ""}`,
      fix: `Use a number (3), range (1-2), or fraction (1/2).`,
    },
    COOKLANG_E0102: {
      why: `Timer has a value but no unit.`,
      fix: `Add a unit, e.g. ~{5%minutes}.`,
    },
    COOKLANG_W0101: {
      why: `Unterminated block comment: "[-" has no matching "-]".`,
      fix: `Close the comment with "-]", or remove the "[-" if it was not meant as a comment.`,
    },
    // -- Domain 2: references -----------------------------------------------
    COOKLANG_E0201: {
      why: (p: { name: string }) =>
        `Referenced ingredient "${p.name}" was not defined before use.`,
      fix: `Define the ingredient earlier in the recipe, or drop the '&' to create a new entry.`,
    },
    COOKLANG_E0202: {
      why: (p: { name: string }) =>
        `Referenced cookware "${p.name}" was not defined before use.`,
      fix: `Define the cookware earlier in the recipe, or drop the '&' to create a new entry.`,
    },
    COOKLANG_E0203: {
      why: (p: { itemType: string; name: string; flag: string }) =>
        `Referenced ${p.itemType} "${p.name}" cannot be redefined as "${p.flag}".`,
      fix: `Remove the reference ('&') to create a new entry, or add the flag to the original definition.`,
    },
    // -- Domain 3: metadata --------------------------------------------------
    COOKLANG_E0301: {
      why: `Tabs are not allowed for indentation in metadata blocks.`,
      fix: `Replace tab characters with spaces.`,
    },
    COOKLANG_E0302: {
      why: `Inconsistent indentation in a metadata block.`,
      fix: `Use consistent space indentation (no mixing of levels).`,
    },
    COOKLANG_W0301: {
      why: (p: { key: string; value: string }) =>
        `The "${p.key}" value "${p.value}" is not a number, so 1 will be used when scaling.`,
      fix: `Use a number, e.g. "servings: 4".`,
    },
    // -- Domain 4: quantities and units --------------------------------------
    COOKLANG_I0401: {
      why: (p: { unit1: string; unit2: string }) =>
        `Cannot add quantities with incompatible or unknown units: ${p.unit1} and ${p.unit2}`,
      fix: `This should not be reachable from normal library usage. Please report it with a reproduction.`,
    },
    COOKLANG_W0401: {
      why: `Text-valued quantities could not be combined and were kept separate.`,
      fix: `Use numeric quantities if they need to be added together.`,
    },
    COOKLANG_E9401: {
      why: `One of both values is not a number, so a ratio cannot be computed`,
      fix: `Use numeric quantities.`,
    },
    COOKLANG_E9402: {
      why: `A fraction cannot have a zero denominator.`,
      fix: `Use a nonzero denominator, e.g. 1/2.`,
    },
    // -- Domain 5: shopping list ----------------------------------------------
    COOKLANG_E9501: {
      why: (p: { detail: string }) => p.detail,
      fix: `Provide a choice for every alternative of the recipe when adding it to the shopping list.`,
    },
    COOKLANG_E9502: {
      why: `Index out of bounds`,
      fix: `Use an index between 0 and the number of items minus one.`,
    },
    COOKLANG_E9503: {
      why: (p: { path: string }) =>
        `Unknown recipe path: "${p.path}". It was not found in the loaded refs.`,
      fix: `Load a shopping list file referencing this path before hydrating it.`,
    },
    COOKLANG_E9504: {
      why: `Invalid pantry: expected a Pantry instance or TOML string`,
      fix: `Pass a Pantry instance or the TOML content of a pantry file.`,
    },
    COOKLANG_E9505: {
      why: `Invalid category configuration`,
      fix: `Pass a CategoryConfig instance or the text of a category configuration.`,
    },
    // -- Domain 6: cart and product catalog -----------------------------------
    COOKLANG_E9601: {
      why: (p: { detail: string }) =>
        `Invalid product catalog TOML: ${p.detail}`,
      fix: `Fix the TOML syntax of the product catalog.`,
    },
    COOKLANG_E9602: {
      why: `Invalid product catalog format.`,
      fix: `Make sure every ingredient is a TOML table with a list of products.`,
    },
    COOKLANG_E9603: {
      why: `Cannot build a cart without a product catalog. Please set one using setProductCatalog()`,
      fix: `Call setProductCatalog() before buildCart().`,
    },
    COOKLANG_E9604: {
      why: `Cannot build a cart without a shopping list. Please set one using setShoppingList()`,
      fix: `Call setShoppingList() before buildCart().`,
    },
    COOKLANG_W0601: {
      why: (p: { message: string }) => p.message,
      fix: `Add a matching product with compatible units to the product catalog.`,
    },
    // -- Domain 7: pantry and category configuration --------------------------
    COOKLANG_E9701: {
      why: (p: { detail: string }) => `Invalid pantry TOML: ${p.detail}`,
      fix: `Fix the TOML syntax of the pantry file.`,
    },
    COOKLANG_W0701: {
      why: (p: { line: string }) =>
        `An ingredient was found without a category and therefore skipped: ${p.line}`,
      fix: `Add a [category] header before the first ingredient.`,
    },
    COOKLANG_W0702: {
      why: (p: { alias: string }) =>
        `Duplicate ingredient/alias found: ${p.alias}`,
      fix: `Make sure each ingredient name or alias appears only once.`,
    },
    COOKLANG_E0701: {
      why: (p: { detail: string }) => p.detail,
      fix: `Use a valid date matching the configured date format.`,
    },
    COOKLANG_E0702: {
      why: (p: { name: string }) => `Duplicate category found: ${p.name}`,
      fix: `Declare each category only once.`,
    },
  },
});

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

type Catalog = typeof diagnosticCatalog;
type CatalogParams<K extends DiagnosticCode> = Parameters<
  Catalog[K]
>[0] extends infer P
  ? P extends object
    ? Omit<P, "cause" | "sources">
    : Record<never, never>
  : never;

/**
 * Returns the severity encoded in a diagnostic code
 * (`E` or `I` → error, `W` → warning).
 *
 * @category Diagnostics
 */
export function severityOfCode(code: DiagnosticCode): DiagnosticSeverity {
  return code.charAt(9) === "W" ? "warning" : "error";
}

export function createDiagnostic<K extends DiagnosticCode>(
  code: K,
  params: CatalogParams<K>,
  span?: DiagnosticSourceSpan,
): Diagnostic {
  const d = diagnosticCatalog[code](params as never);
  return {
    code,
    message: d.message,
    fix: d.fix,
    docs: d.docs,
    severity: severityOfCode(code),
    span,
  };
}
