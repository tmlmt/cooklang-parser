# Parse diagnostics

`Recipe.parse()` collects known recipe syntax problems and returns a partial
recipe, ordered diagnostics, and the original source string.

```typescript
import {
  Recipe,
  formatDiagnostics,
} from "@tmlmt/cooklang-parser";

const result = new Recipe().parse(`
Add @flour{%two} and cook for ~{5}
`);

console.log(formatDiagnostics(result.diagnostics, result.source));
```

Each diagnostic contains a stable `code`, human-readable `message`, optional
`fix` and `docs` URL, `severity`, and an optional source `span`. Lines and
columns are 1-based. Offsets are 0-based UTF-16 code-unit indices into
`ParseResult.source`, which is exactly the input passed to `parse()`.

## Throwing on errors

Use `Recipe.parseOrThrow(source)` for exception-based control flow. It returns a
`Recipe` for a clean parse and throws one `CooklangParseError` when any
error-severity diagnostic exists. The error carries a snapshot of all collected
diagnostics and the original source.

```typescript
import {
  CooklangParseError,
  Recipe,
  formatDiagnostics,
} from "@tmlmt/cooklang-parser";

try {
  const recipe = Recipe.parseOrThrow(source);
  useRecipe(recipe);
} catch (error) {
  if (error instanceof CooklangParseError) {
    console.error(formatDiagnostics(error.diagnostics, error.source));
  } else {
    throw error;
  }
}
```

## Diagnostic codes

| Code | Meaning |
| --- | --- |
| `invalid-quantity` | A recipe quantity cannot be parsed. |
| `timer-missing-unit` | A timer has a value but no unit. |
| `referenced-ingredient-not-found` | An ingredient reference has no earlier definition. |
| `referenced-cookware-not-found` | A cookware reference has no earlier definition. |
| `referenced-item-redefined` | A reference attempts to change a flag from its definition. |
| `no-tab-indent` | Metadata indentation contains a tab. |
| `bad-indentation` | Metadata indentation levels are inconsistent. |

Documentation URLs under `/e/<code>` are stable placeholders while dedicated
code pages are authored. The current catalog emits `error` diagnostics; the
public severity type also supports future warnings.

## Recovery

Known token-level errors are collected and the parser continues with later
tokens and lines. Invalid tokens may be omitted from the partial recipe. Unknown
exceptions and internal invariant failures are not converted into diagnostics;
they still throw because they indicate unsupported input or a library defect.

Diagnostics currently cover `Recipe` parsing only. `Pantry` TOML/date failures,
shopping-list usage errors, scaling errors, and other APIs retain their existing
exception behavior.

## Migrating from fail-fast parsing

Code that previously relied on `Recipe.parse()` throwing should switch to
`Recipe.parseOrThrow()`. Code that wants editor feedback or batch validation
should use `parse()`, inspect `result.diagnostics`, and format them against
`result.source`.
