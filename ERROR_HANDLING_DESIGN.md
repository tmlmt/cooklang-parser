# Design plan — parse-time error diagnostics

> Status: proposal (implementation deferred).
> Confirmed decisions: (1) **collect-all** diagnostics model (breaking change),
> (2) scope limited to **parse-time errors**, (3) library: **`nostics`**,
> (4) **severity split** (`error | warning`) from the start,
> (5) `parseOrThrow` throws a single **`CooklangParseError`** carrying
> `.diagnostics[]`, (6) docs URLs **stubbed** at `/e/<code>` for now,
> (7) column accuracy via a **precomputed line-offset map**,
> (8) **all three** anonymous-error buckets addressed.

## 1. Problem

Today error handling in the parser is thin:

- ~45 `throw` sites across 8 files; roughly half are typed classes in
  [`src/errors.ts`](src/errors.ts), the rest are anonymous `new Error("...")`.
- **No positional information** — nothing knows _where_ in the source a problem is.
- **Fail-fast** — [`Recipe.parse()`](src/classes/recipe.ts) aborts on the first
  `throw`, so a recipe with several mistakes only ever surfaces one.
- **No pretty-printing** — messages are plain strings.

Goal: report **which** known errors occurred, **where** in the cooklang text
(line, character), and **pretty-print** them.

Enabling fact: [`Recipe.parse()`](src/classes/recipe.ts) already iterates
line-by-line, and `currentLine.matchAll(tokensRegex)` exposes `match.index`
(the column) for every token — so **line + column are cheap to capture** at the
point most errors are raised; the plumbing simply isn't wired yet.

## 2. Library evaluation

| Option              | Deps                               | Model                                                                                                                                                         | Code-frame w/ caret                                                                    | Fit                                     |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------- |
| **`nostics`**       | 0 (core)                           | Central catalog of stable codes + typed params + `why`/`fix`/`docs`; `Diagnostic extends Error`; pluggable formatters (plain/ansi/json); collect **or** throw | No (renders `file:line:col`), but custom formatter API `(d) => string` lets us add one | **Best**                                |
| `@babel/code-frame` | CJS + transitive (`picocolors`, …) | Single-frame renderer only                                                                                                                                    | Yes                                                                                    | Frame only, no catalog; heavy CJS chain |
| In-house            | 0                                  | Whatever we build                                                                                                                                             | Yes (we write it)                                                                      | Full control, all maintenance on us     |

### Why `nostics`

- **Zero runtime deps, ESM-native, TS-first** — matches this repo's ethos (4
  small deps, `sideEffects:false`, tree-shakeable, 100 % coverage target). Much
  lighter than dragging in the CJS `@babel` chain.
- **Directly solves "proper management of known errors"**: replaces scattered
  ad-hoc strings with one **catalog of stable codes** (`why`, `fix`, `docs`),
  typed params inferred at each call site.
- `Diagnostic extends Error` → we can **collect** many (new model) _or_ still
  `throw` one — no lock-in.
- Structured shape (`code`, `message`, `fix`, `docs`, `sources`, `cause`) is
  great for both humans and tooling/agents.
- Maintained by the Nuxt/Vue core team (posva, antfu, danielroe), MIT.

### The one gap and how we close it

`nostics` `sources` are **strings** like `"recipe.cook:5:18"` — a location
_reference_, not a source line with a `^^^` caret. It pretty-prints the
_diagnostic_ (code / why / fix / sources / docs) but not a code-frame.

We close the gap with a **small custom formatter** (nostics accepts any
`(diagnostic: Diagnostic) => string`). We attach the numeric span + the source
text to the diagnostic, and the formatter renders:

```
error[invalid-quantity]: Invalid quantity format
  ┌─ recipe.cook:5:18
  │
5 │ Crack the @eggs{3x} with @flour{100%g}
  │                 ^^ expected a number, range, or fraction
  = fix: use a number, range (1-2), or fraction (1/2)
  = see: https://cooklang-parser.tmlmt.com/e/invalid-quantity
```

Net recommendation: **`nostics` for the diagnostics backbone + a ~40-line
in-house code-frame formatter** for the caret view.

## 3. Architecture

### 3.1 Source spans (`src/types.ts`)

```ts
export interface SourcePosition {
  offset: number;
  line: number;
  column: number;
}
export interface SourceSpan {
  start: SourcePosition;
  end: SourcePosition;
}
```

A tiny helper turns `(lineIndex, columnIndex, length)` — which the parse loop
already has — into a `SourceSpan`, plus an `offset` computed from precomputed
line-start offsets of the original (pre-cleaned) content.

> Note: `parse()` currently strips metadata/comments _before_ splitting into
> lines. To keep columns accurate we track spans against the **original**
> `content`; the cleaning step must preserve offsets (replace with equal-length
> blanks) or we compute a line-offset map up front. This is the main
> implementation subtlety.

### 3.2 Diagnostics catalog (`src/diagnostics.ts`)

One `defineDiagnostics({ docsBase, codes })` catalog with **stubbed** docs URLs
(pages authored later). Each code carries a `severity` (`error | warning`);
warnings are collected and parsing continues. Codes use explicit, readable names
(nostics allows any string):

```ts
export const diagnostics = defineDiagnostics({
  docsBase: (code) => `https://cooklang-parser.tmlmt.com/e/${code}`,
  codes: {
    "invalid-quantity": {
      why: (p: { value: string }) => `Invalid quantity format: "${p.value}"`,
      fix: () => `Use a number, range (1-2), or fraction (1/2).`,
    },
    "timer-missing-unit": { why: () => `Timer has a value but no unit.` },
    "referenced-ingredient-not-found": {
      why: (p: { name: string }) =>
        `Referenced ingredient "${p.name}" was not defined before use.`,
      fix: () => `Define it earlier, or drop the '&' to create a new one.`,
    },
    "referenced-cookware-not-found": {/* … */},
    "referenced-item-redefined": {/* … */},
    "no-tab-indent": {/* … */},
    "bad-indentation": {/* … */},
    "invalid-date-format": {/* … */},
  },
});
```

Note: **no `reporters`** are configured — for a library we must not auto-print
to console. Calling a handle just builds and returns a `Diagnostic`; we collect
those and hand them back to the consumer.

### 3.3 Collector + result (breaking change)

New collect-all model. `parse()` accumulates diagnostics instead of throwing on
the first error:

```ts
export interface ParseResult {
  recipe: Recipe;
  diagnostics: Diagnostic[]; // empty ⇒ clean parse
}
```

- Recoverable parse-time problems are **collected**; the parser continues with a
  best-effort value (e.g. skip the bad token, keep the rest of the step).
- `Recipe.parseOrThrow(text)` throws a single **`CooklangParseError`** (new class
  in [`src/errors.ts`](src/errors.ts)) exposing `.diagnostics: Diagnostic[]`;
  its `message` summarizes counts and it only throws when at least one
  `severity: "error"` diagnostic is present (warnings alone do not throw).
- `diagnostic.format(source)` / a top-level `formatDiagnostics(diags, source)`
  produce the pretty code-frame output (§2 gap-closing formatter), coloring the
  caret/label by `severity`.

Spans are resolved through a **precomputed line-offset map** built once from the
**original** `content` (array of each line's start offset). `spanOf(lineIdx,
column, len)` uses it to produce accurate `{ offset, line, column }` regardless of
the metadata/comment stripping that `parse()` performs before splitting lines.

### 3.4 Attaching spans

Each call site passes `sources: ["recipe.cook:" + line + ":" + column]` plus a
private carrier for the numeric span + length so the custom formatter can draw
the caret. Example call site (replaces `throw new InvalidQuantityFormat(...)`):

```ts
push(
  diagnostics["invalid-quantity"]({
    value: quantityRaw,
    sources: [loc(spanOf(lineIdx, matchStart, len))],
    span: spanOf(lineIdx, matchStart, len), // carried for the code-frame formatter
  }),
);
```

## 4. Parse-time throw sites in scope

| Current site                                                                                    | New code                          |
| ----------------------------------------------------------------------------------------------- | --------------------------------- |
| `InvalidQuantityFormat` — [recipe.ts:361](src/classes/recipe.ts#L361), `parseArbitraryQuantity` | `invalid-quantity`                |
| `"Timer missing unit"` — [recipe.ts:1652](src/classes/recipe.ts)                                | `timer-missing-unit`              |
| Referenced ingredient not found — [parser_helpers.ts:116](src/utils/parser_helpers.ts)          | `referenced-ingredient-not-found` |
| Referenced cookware not found — [parser_helpers.ts:173](src/utils/parser_helpers.ts)            | `referenced-cookware-not-found`   |
| `ReferencedItemCannotBeRedefinedError` (ingredient/cookware) — parser_helpers                   | `referenced-item-redefined`       |
| `NoTabAsIndentError` — `parseNestedBlock`                                                       | `no-tab-indent`                   |
| `BadIndentationError` — `parseNestedBlock`                                                      | `bad-indentation`                 |
| `Invalid date format` — parser_helpers                                                          | `invalid-date-format`             |

Pure quantity-arithmetic errors (`CannotAddTextValueError`,
`IncompatibleUnitsError`) surfacing while merging a referenced cookware quantity
during parse are mapped to a parse diagnostic at that call site, keeping the
underlying classes intact for non-parse callers.

### 4.1 Anonymous-error cleanup (all three buckets)

| Bucket                     | Sites                                                                                                                                                              | Action                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Parse-time**          | `"Referenced ingredient not found"`, `"Referenced cookware not found"`, `"Invalid date format"` (parser_helpers), `"Timer missing unit"` (recipe.ts)               | Become catalog diagnostic **codes** with spans (already in §4 table)                                                                                       |
| **2. Usage errors**        | `"Duplicate category found"` ([category_config.ts](src/classes/category_config.ts)), `"Index out of bounds"` ×N ([shopping_list.ts](src/classes/shopping_list.ts)) | Promote to **named classes** in [`src/errors.ts`](src/errors.ts) (centralized messages, `instanceof`-checkable); remain ordinary `throw`s, not diagnostics |
| **3. Internal invariants** | `"Denominator cannot be zero"` ([numeric.ts](src/quantities/numeric.ts))                                                                                           | Wrap in a single **`InternalError`** class (signals a bug, not user input)                                                                                 |

## 5. Back-compat & migration

- **Breaking**: `Recipe.parse()` no longer throws on recoverable parse errors;
  it records them. `new Recipe(text)` should expose `recipe.diagnostics`.
  Document in `CHANGELOG.md` (already `3.0.0-alpha`, so acceptable).
- Keep the existing error classes in [`src/errors.ts`](src/errors.ts) exported
  for non-parse code paths; parse paths route through the catalog.
- Export new surface from [`src/index.ts`](src/index.ts): `diagnostics` (or a
  narrower API), `SourceSpan`, `SourcePosition`, `ParseResult`,
  `CooklangParseError`, `formatDiagnostics`, `Recipe.parseOrThrow`, and the new
  named classes from bucket 2 + `InternalError`.

## 6. Testing / coverage

- Unit-test span math (line/column/offset) against multi-line fixtures incl.
  `\r\n`, and content after metadata stripping.
- One test per catalog code: assert `code`, `message`, and `span`.
- Snapshot the code-frame formatter output (plain, no ANSI) in
  `test/__snapshots__/`.
- Add a `test/diagnostics.test.ts` and extend `test/errors_text.test.ts`.
- Maintain 100 % coverage; `/* v8 ignore else -- @preserve */` only for
  genuinely unreachable branches, documented.

## 7. Resolved decisions

1. **Severity** — ship with an `error | warning` split from the start; warnings
   are collected and parsing continues.
2. **`parseOrThrow`** — throws one `CooklangParseError` exposing `.diagnostics[]`
   (only when an `error`-severity diagnostic exists).
3. **Docs registry** — stub `/e/<code>` URLs now via nostics `docsBase`; author
   the pages in follow-up work.
4. **Column accuracy** — precompute a line-offset map from the original content.
5. **Anonymous errors** — handle all three buckets (see §4.1).
