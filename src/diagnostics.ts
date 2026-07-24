/**
 * Nostics-backed diagnostic catalog for parse-time errors.
 *
 * Each exported function creates a {@link CooklangParseDiagnostic} for a
 * specific parse-time problem. They are the only place where diagnostic
 * codes are defined; keep them here and nowhere else.
 *
 * No reporters are configured — this is a library, so nothing is ever
 * auto-printed to the console.
 */
import { defineDiagnostics } from "nostics";
import type { CooklangParseDiagnostic, SourceSpan } from "./types";

// ---------------------------------------------------------------------------
// Internal catalog (nostics provides typed params + docs URL generation)
// ---------------------------------------------------------------------------

const _catalog = defineDiagnostics({
  docsBase: (code) => `https://cooklang-parser.tmlmt.com/e/${code}`,
  codes: {
    "invalid-quantity": {
      why: (p: { value: string }) =>
        `Invalid quantity format: "${p.value}"`,
      fix: `Use a number (3), range (1-2), or fraction (1/2).`,
    },
    "timer-missing-unit": {
      why: `Timer has a value but no unit.`,
      fix: `Add a unit, e.g. ~{5%minutes}.`,
    },
    "referenced-ingredient-not-found": {
      why: (p: { name: string }) =>
        `Referenced ingredient "${p.name}" was not defined before use.`,
      fix: `Define the ingredient earlier in the recipe, or drop the '&' to create a new entry.`,
    },
    "referenced-cookware-not-found": {
      why: (p: { name: string }) =>
        `Referenced cookware "${p.name}" was not defined before use.`,
      fix: `Define the cookware earlier in the recipe, or drop the '&' to create a new entry.`,
    },
    "referenced-item-redefined": {
      why: (p: { itemType: string; name: string; flag: string }) =>
        `Referenced ${p.itemType} "${p.name}" cannot be redefined as "${p.flag}".`,
      fix: `Remove the reference ('&') to create a new entry, or add the flag to the original definition.`,
    },
    "no-tab-indent": {
      why: `Tabs are not allowed for indentation in metadata blocks.`,
      fix: `Replace tab characters with spaces.`,
    },
    "bad-indentation": {
      why: `Inconsistent indentation in a metadata block.`,
      fix: `Use consistent space indentation (no mixing of levels).`,
    },
    "metadata-parse-error": {
      why: (p: { detail: string }) => p.detail,
      fix: `Check the metadata section of your recipe.`,
    },
  },
});

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

type CatalogKey = keyof typeof _catalog;
type CatalogParams = {
  "invalid-quantity": { value: string };
  "timer-missing-unit": Record<never, never>;
  "referenced-ingredient-not-found": { name: string };
  "referenced-cookware-not-found": { name: string };
  "referenced-item-redefined": { itemType: string; name: string; flag: string };
  "no-tab-indent": Record<never, never>;
  "bad-indentation": Record<never, never>;
  "metadata-parse-error": { detail: string };
};

function make<K extends CatalogKey>(
  key: K,
  params: CatalogParams[K],
  severity: "error" | "warning",
  span?: SourceSpan,
): CooklangParseDiagnostic {
  const d = _catalog[key](params as never);
  return {
    code: d.name,
    message: d.message,
    fix: d.fix,
    docs: d.docs,
    severity,
    span,
  };
}

// ---------------------------------------------------------------------------
// Public factory functions
// ---------------------------------------------------------------------------

/**
 * Creates an `invalid-quantity` diagnostic.
 * Emitted when a quantity string inside `{…}` cannot be parsed.
 */
export function invalidQuantityDiagnostic(
  params: { value: string },
  span?: SourceSpan,
): CooklangParseDiagnostic {
  return make("invalid-quantity", params, "error", span);
}

/**
 * Creates a `timer-missing-unit` diagnostic.
 * Emitted when `~{value}` has a value but no unit.
 */
export function timerMissingUnitDiagnostic(
  span?: SourceSpan,
): CooklangParseDiagnostic {
  return make("timer-missing-unit", {}, "error", span);
}

/**
 * Creates a `referenced-ingredient-not-found` diagnostic.
 * Emitted when `@&name` references an ingredient not yet declared.
 */
export function referencedIngredientNotFoundDiagnostic(
  params: { name: string },
  span?: SourceSpan,
): CooklangParseDiagnostic {
  return make("referenced-ingredient-not-found", params, "error", span);
}

/**
 * Creates a `referenced-cookware-not-found` diagnostic.
 * Emitted when `#&name` references cookware not yet declared.
 */
export function referencedCookwareNotFoundDiagnostic(
  params: { name: string },
  span?: SourceSpan,
): CooklangParseDiagnostic {
  return make("referenced-cookware-not-found", params, "error", span);
}

/**
 * Creates a `referenced-item-redefined` diagnostic.
 * Emitted when a reference (`&`) tries to change a flag on the original item.
 */
export function referencedItemRedefinedDiagnostic(
  params: { itemType: string; name: string; flag: string },
  span?: SourceSpan,
): CooklangParseDiagnostic {
  return make("referenced-item-redefined", params, "error", span);
}

/**
 * Creates a `no-tab-indent` diagnostic.
 * Emitted when a metadata block contains tab indentation.
 */
export function noTabIndentDiagnostic(
  span?: SourceSpan,
): CooklangParseDiagnostic {
  return make("no-tab-indent", {}, "error", span);
}

/**
 * Creates a `bad-indentation` diagnostic.
 * Emitted when a metadata block has inconsistent space indentation.
 */
export function badIndentationDiagnostic(
  span?: SourceSpan,
): CooklangParseDiagnostic {
  return make("bad-indentation", {}, "error", span);
}

/**
 * Creates a `metadata-parse-error` diagnostic.
 * Emitted for other metadata errors (e.g. invalid date values).
 */
export function metadataParseErrorDiagnostic(
  params: { detail: string },
  span?: SourceSpan,
): CooklangParseDiagnostic {
  return make("metadata-parse-error", params, "error", span);
}
