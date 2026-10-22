# Parse diagnostics

`Recipe.parse()` (and the `Recipe` constructor) collects known recipe problems
as diagnostics. Warnings are available on `recipe.diagnostics`. If at least one
diagnostic has error severity, a single `DiagnosticError` is thrown once the
whole source has been processed; the recipe instance keeps the partial result.

```typescript
import {
  DiagnosticError,
  Recipe,
  formatDiagnostics,
} from "@tmlmt/cooklang-parser";

const recipe = new Recipe();
try {
  recipe.parse(source);
} catch (error) {
  if (error instanceof DiagnosticError) {
    console.error(formatDiagnostics(error.diagnostics, error.source));
  } else {
    throw error;
  }
}

// Non-fatal diagnostics (warnings) are always available
console.log(recipe.diagnostics);
```

Each diagnostic contains a stable `code`, human-readable `message`, optional
`fix` and `docs` URL, `severity`, and an optional source `span`. Lines and
columns are 1-based. Offsets are 0-based UTF-16 code-unit indices into
`DiagnosticError.source`, which is exactly the input passed to `parse()`.

`CategoryConfig`, `Pantry` and `ProductCatalog` behave identically: `parse()`
and the constructors throw `DiagnosticError`, and expose `diagnostics` and
`source` on the instance.

## Diagnostic codes

Codes follow the pattern `COOKLANG_<L><T><D><NN>`: `L` is the letter (`E` for
error, `W` for warning, `I` for internal/library bug); `T` is a tier digit
used only for `E` codes (`0` = non-fatal — caught and collected alongside
other diagnostics while parsing continues, so you get a complete picture of
every problem found; `9` = fatal — the result cannot be considered usable
once this is found). `T` is always `0` for `W` and `I` codes: warnings never
make the call fail, and internal errors always behave like fatal ones but
indicate a library bug rather than a problem with your input. `D` is the
domain digit (`0` generic/internal, `1` syntax, `2` references, `3` metadata,
`4` quantities and units, `5` shopping list, `6` cart and product catalog,
`7` pantry and category configuration) and `NN` a 2-digit sequence number.

Each code has its own page, linked from `diagnostic.docs`
(`/v3/e/<code in lowercase>`). See the [full list of codes](/e/).

Parse-time diagnostics, reported by `Recipe.parse()`:

| Code | Level | Meaning |
| --- | --- | --- |
| [`COOKLANG_E0101`](/e/cooklang_e0101) | error | A recipe quantity cannot be parsed. |
| [`COOKLANG_E0102`](/e/cooklang_e0102) | error | A timer has a value but no unit. |
| [`COOKLANG_W0101`](/e/cooklang_w0101) | warning | A block comment is never closed. |
| [`COOKLANG_E0201`](/e/cooklang_e0201) | error | An ingredient reference has no earlier definition. |
| [`COOKLANG_E0202`](/e/cooklang_e0202) | error | A cookware reference has no earlier definition. |
| [`COOKLANG_E0203`](/e/cooklang_e0203) | error | A reference attempts to change a flag from its definition. |
| [`COOKLANG_E0301`](/e/cooklang_e0301) | error | Metadata indentation contains a tab. |
| [`COOKLANG_E0302`](/e/cooklang_e0302) | error | Metadata indentation levels are inconsistent. |
| [`COOKLANG_W0301`](/e/cooklang_w0301) | warning | `servings` or `serves` is not a number. |
| [`COOKLANG_E9401`](/e/cooklang_e9401) | error (fatal) | A text quantity (e.g. "a pinch") could not be merged with another occurrence of the same ingredient. |
| [`COOKLANG_E9402`](/e/cooklang_e9402) | error (fatal) | A text equivalent could not be merged with another occurrence of the same ingredient. |

Warnings never make `parse()` throw. Non-fatal errors (`E0…`) are collected
alongside everything else so that the whole recipe gets reported in one
pass; fatal errors (`E9…`) abort the call immediately once encountered. The
catalog and the severity of a code are available programmatically through
`diagnosticCatalog` and `severityOfCode()`.

## Errors thrown by other APIs

Every other error thrown by the library (shopping list, cart, product catalog,
pantry, category configuration, quantity arithmetic) extends `SingleDiagnosticError`,
which exposes the same structured `diagnostic` (`code`, `message`, `fix`,
`docs`) as parse diagnostics:

```typescript
import { SingleDiagnosticError } from "@tmlmt/cooklang-parser";

try {
  list.removeRecipe(42);
} catch (error) {
  if (error instanceof SingleDiagnosticError) {
    console.error(error.code, error.diagnostic.fix, error.diagnostic.docs);
  }
}
```

These are always thrown directly — missing prerequisites (no product
catalog set, no pantry provided), bad arguments (an out-of-range index, an
unknown recipe path, a value of the wrong type) and invalid TOML syntax all
abort the call immediately rather than being collected into a `diagnostics`
array.

## Internal errors (`I…`)

Codes starting with `I` (e.g. `COOKLANG_I0001`, `COOKLANG_I0401`) indicate a
bug in the library itself, not a problem with your input. They behave like
fatal errors (always thrown immediately) but should never actually be
reachable through normal, documented usage of the public API. If you see
one, please [open an issue](https://github.com/tmlmt/cooklang-parser/issues)
with a minimal reproduction.

## Recovery

Known token-level errors are collected and the parser continues with later
tokens and lines. Invalid tokens may be omitted from the partial recipe. Unknown
exceptions and internal invariant failures are not converted into diagnostics;
they still throw because they indicate unsupported input or a library defect.

## Migrating from earlier v3 alphas

Code that catches a specific typed error from `parse()` or a constructor of
`CategoryConfig`, `Pantry` or `ProductCatalog` (e.g. `DuplicateCategoryError`)
now receives a `DiagnosticError`; inspect `error.diagnostics[].code` instead.
