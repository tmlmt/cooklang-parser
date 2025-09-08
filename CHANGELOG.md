# Changelog

## v1.4.4

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.4.3...v1.4.4)

### 🩹 Fixes

- **docs:** Broken links in top-right corner menu ([20ae0ff](https://github.com/tmlmt/cooklang-parser/commit/20ae0ff))
- Range quantities incorrectly parsed as text ([4799fcc](https://github.com/tmlmt/cooklang-parser/commit/4799fcc))

### 💅 Refactors

- Do not try to reuse previously added timer with same values and simply push new timers as they are defined ([ba46320](https://github.com/tmlmt/cooklang-parser/commit/ba46320))

### 📖 Documentation

- Make sidebar items collapsible ([e7f335c](https://github.com/tmlmt/cooklang-parser/commit/e7f335c))
- Add link to npm package webpage ([b5a6b28](https://github.com/tmlmt/cooklang-parser/commit/b5a6b28))
- Add link to personal homepage ([22b3d1a](https://github.com/tmlmt/cooklang-parser/commit/22b3d1a))
- Add aria labels to social links ([6228aa6](https://github.com/tmlmt/cooklang-parser/commit/6228aa6))

### 🏡 Chore

- **README:** Update readme ([354e4ba](https://github.com/tmlmt/cooklang-parser/commit/354e4ba))
- **README:** Make API link point to Recipe class doc ([3a912b9](https://github.com/tmlmt/cooklang-parser/commit/3a912b9))
- Remove unused import ([aa9621d](https://github.com/tmlmt/cooklang-parser/commit/aa9621d))

### ✅ Tests

- **parser_helper:** Increase coverage ([10cc9cd](https://github.com/tmlmt/cooklang-parser/commit/10cc9cd))
- **units:** Increase coverage ([18dc46f](https://github.com/tmlmt/cooklang-parser/commit/18dc46f))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v1.4.3

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.4.2...v1.4.3)

### 🩹 Fixes

- **docs:** ScaleBy and scaleTo actually return a new Recipe ([1ce6e58](https://github.com/tmlmt/cooklang-parser/commit/1ce6e58))
- **scaling:** Preserve fractions when multipier is integer or inverse of one ([84ff940](https://github.com/tmlmt/cooklang-parser/commit/84ff940))

### 📖 Documentation

- Add details and examples to the guide about extensions ([7a8e27a](https://github.com/tmlmt/cooklang-parser/commit/7a8e27a))
- Add explanation and examples for scaling recipes ([7daa10c](https://github.com/tmlmt/cooklang-parser/commit/7daa10c))
- Add explanation and examples for shopping lists ([364bcfa](https://github.com/tmlmt/cooklang-parser/commit/364bcfa))
- Add toc to extensions guide ([8c468eb](https://github.com/tmlmt/cooklang-parser/commit/8c468eb))

### 🏡 Chore

- **scripts:** Change default prompt answer to continuing the release process ([1ef7318](https://github.com/tmlmt/cooklang-parser/commit/1ef7318))
- **test:** Remove unnecessary initialization of recipe properties in recipe_scaling tests ([3e05f31](https://github.com/tmlmt/cooklang-parser/commit/3e05f31))
- **test:** Remove unnecessary categorize() calls ([5725e24](https://github.com/tmlmt/cooklang-parser/commit/5725e24))
- **test:** Remove unnecessary initialization of shopping_list tests ([0048151](https://github.com/tmlmt/cooklang-parser/commit/0048151))

### ✅ Tests

- **simplifyFraction:** Add test when the numerator is < 1 ([9c71acd](https://github.com/tmlmt/cooklang-parser/commit/9c71acd))
- **scaling:** Add check for fraction and range values ([0ced2da](https://github.com/tmlmt/cooklang-parser/commit/0ced2da))

### 🤖 CI

- **scripts:** Make yes as default answer to prompts for confirmation ([eabc017](https://github.com/tmlmt/cooklang-parser/commit/eabc017))
- **release:** Check that lint, test and docs:build run without error before releasing ([d467a31](https://github.com/tmlmt/cooklang-parser/commit/d467a31))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v1.4.2

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.4.1...v1.4.2)

### 🏡 Chore

- **README:** remove details about extensions and refer to docs  ([43419c6](https://github.com/tmlmt/cooklang-parser/commit/43419c6))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v1.4.1

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.4.0...v1.4.1)

### 🩹 Fixes

- **docs:** Dead links ([57fce2b](https://github.com/tmlmt/cooklang-parser/commit/57fce2b))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v1.4.0

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.3.0...v1.4.0)

### 🚀 Enhancements

- **units:** Add additional aliases ([1efe2e1](https://github.com/tmlmt/cooklang-parser/commit/1efe2e1))

### 📖 Documentation

- **ShoppingList:** Add note about automatic tasks done by add/remove_recipe ([f5b2e51](https://github.com/tmlmt/cooklang-parser/commit/f5b2e51))
- Add guides for cooklang spec, extensions, units and conversions ([a80c4fe](https://github.com/tmlmt/cooklang-parser/commit/a80c4fe))

### 🎨 Styles

- **README:** More concise quick-start with bullets ([b7de32d](https://github.com/tmlmt/cooklang-parser/commit/b7de32d))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v1.3.0

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.2.5...v1.3.0)

#### ⚠️ Breaking Changes

In order to use a more generic terms for categories of ingredients in a shopping list, the `AisleConfig` parser is renamed `CategoryConfig`. All associated types are also renamed accordingly (e.g. `Aisle` is now `Category`)

This is considered part of arbitrary changes during the rapid development of v1 the parser and therefore does not trigger a bump to a new major version.

### 🚀 Enhancements

- **ShoppingList:** Allow category configuration to be provided either as a `string` or as a `CategoryConfig` ([0457f5f](https://github.com/tmlmt/cooklang-parser/commit/0457f5f))

### 💅 Refactors

- ⚠️ Rename 'Aisle' to more generic term 'Category' ([8976e62](https://github.com/tmlmt/cooklang-parser/commit/8976e62))

### 📖 Documentation

- Removed non-public MetadataExtract interface ([03ce27c](https://github.com/tmlmt/cooklang-parser/commit/03ce27c))
- Improve classes description, add examples remove unnecessary `@see` tags ([6ade28c](https://github.com/tmlmt/cooklang-parser/commit/6ade28c))

### 🏡 Chore

- **README:** Update future plans ([956b8ea](https://github.com/tmlmt/cooklang-parser/commit/956b8ea))
- **lint:** Check TSDoc syntax ([c51761d](https://github.com/tmlmt/cooklang-parser/commit/c51761d))
- **typescript:** Downgrade expected error in vitepress config file to warning ([f521c13](https://github.com/tmlmt/cooklang-parser/commit/f521c13))
- **parser_helpers:** Fix - missing after @param tags ([4bc4626](https://github.com/tmlmt/cooklang-parser/commit/4bc4626))
- **README:** Add badges ([49658d1](https://github.com/tmlmt/cooklang-parser/commit/49658d1))
- Lint ([f4d165f](https://github.com/tmlmt/cooklang-parser/commit/f4d165f))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v1.2.5

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.2.4...v1.2.5)

### 🤖 CI

- Fix ts error due to linting performed before typedoc is generated ([5cee224](https://github.com/tmlmt/cooklang-parser/commit/5cee224))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v1.2.4

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.2.3...v1.2.4)

### 💅 Refactors

- Improve typing, remove related eslint warnings and rules overrides ([a0f6bb7](https://github.com/tmlmt/cooklang-parser/commit/a0f6bb7))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v1.2.3

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.2.2...v1.2.3)

### 📦 Build

- Fix build of docs due to bad tsconfig ([06bc22b](https://github.com/tmlmt/cooklang-parser/commit/06bc22b))

### 🏡 Chore

- Add vitepress config.mts file to files to lint outside of the actual TS project ([1ae7079](https://github.com/tmlmt/cooklang-parser/commit/1ae7079))

### 🤖 CI

- Also check types ([10266d3](https://github.com/tmlmt/cooklang-parser/commit/10266d3))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v1.2.2

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.2.1...v1.2.2)

### ✅ Tests

- **section:** Fix isBlank test with correct note structure ([a79f4a7](https://github.com/tmlmt/cooklang-parser/commit/a79f4a7))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v1.2.1

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.2.0...v1.2.1)

### 🏡 Chore

- Lint and turn some repetitive errors to warnings for now ([5c5efe2](https://github.com/tmlmt/cooklang-parser/commit/5c5efe2))
- **README:** Add v1.2 features ([a9408fe](https://github.com/tmlmt/cooklang-parser/commit/a9408fe))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v1.2.0

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.1.0...v1.2.0)

#### ⚠️ Breaking Changes

As part of fixing the non-preservation of individual quantities of referenced ingredients, the `partialQuantity` and `partialUnit` properties of `IngredientItem` in preparation steps are renamed respectively `itemQuantity` and `itemUnit`. Moreover, the `partialPreparation` is removed as the preparation is fixed for a given ingredient in the list and can be accessed via the ingredient reference index.

This is considered part of arbitrary changes during the rapid development of the parser and therefore do not trigger a bump to a new major version.

### 🚀 Enhancements

- Ingredient aliases ([731d856](https://github.com/tmlmt/cooklang-parser/commit/731d856))

### 🩹 Fixes

- ⚠️ Individual quantities of referenced ingredient not preserved in preparation steps ([d233eba](https://github.com/tmlmt/cooklang-parser/commit/d233eba))
- Individual quantities of cookware not preserved in preparation steps ([9f6a008](https://github.com/tmlmt/cooklang-parser/commit/9f6a008))

### 🏡 Chore

- **README:** Add range values to features ([c38463a](https://github.com/tmlmt/cooklang-parser/commit/c38463a))
- **package:** Add useful properties for npm ([e72cbc3](https://github.com/tmlmt/cooklang-parser/commit/e72cbc3))
- Remove `console.log()` ([d956853](https://github.com/tmlmt/cooklang-parser/commit/d956853))
- Reconfigure eslint from scratch ([1b85287](https://github.com/tmlmt/cooklang-parser/commit/1b85287))

### ✅ Tests

- Add test to check that a referenced ingredient's original preparation is immutable ([1f43c47](https://github.com/tmlmt/cooklang-parser/commit/1f43c47))

### 🎨 Styles

- Add `type` property to Note and Step content types ([8266d85](https://github.com/tmlmt/cooklang-parser/commit/8266d85))

### 🤖 CI

- Fix wrong source folder for docs deployment ([4f492a0](https://github.com/tmlmt/cooklang-parser/commit/4f492a0))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v1.1.0

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.0.8...v1.1.0)

### 🚀 Enhancements

- Ranges and fractions for ingredients and timers ([4bdb2ed](https://github.com/tmlmt/cooklang-parser/commit/4bdb2ed))
- Cookware quantities ([5ce03d1](https://github.com/tmlmt/cooklang-parser/commit/5ce03d1))

### 🩹 Fixes

- **regex:** Multi digit quantities not detected ([9888aca](https://github.com/tmlmt/cooklang-parser/commit/9888aca))
- **parser_helpers:** Invalid regular expression on Windows ([0107f62](https://github.com/tmlmt/cooklang-parser/commit/0107f62))

### 💅 Refactors

- **regex:** Human-readable regexp using patched `human-regex` ([eb4450a](https://github.com/tmlmt/cooklang-parser/commit/eb4450a))

### 📖 Documentation

- **recipe:** Adding JSDoc to `getServings()` ([6dcf103](https://github.com/tmlmt/cooklang-parser/commit/6dcf103))
- Add Section to documentation ([ae832e3](https://github.com/tmlmt/cooklang-parser/commit/ae832e3))
- Various visual improvements ([13389e8](https://github.com/tmlmt/cooklang-parser/commit/13389e8))

### 🏡 Chore

- Remove `console.log` ([3a3e2c5](https://github.com/tmlmt/cooklang-parser/commit/3a3e2c5))
- **README:** Update future plans ([40c385e](https://github.com/tmlmt/cooklang-parser/commit/40c385e))
- **README:** Fix command for coverage ([2f32da8](https://github.com/tmlmt/cooklang-parser/commit/2f32da8))
- **README:** Update future plans ([e35b4d3](https://github.com/tmlmt/cooklang-parser/commit/e35b4d3))
- **git:** Ignore vitepress cache ([9de85ff](https://github.com/tmlmt/cooklang-parser/commit/9de85ff))

### ✅ Tests

- **coverage:** Ignore scripts files and types.ts ([eed5977](https://github.com/tmlmt/cooklang-parser/commit/eed5977))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v1.0.8

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.0.7...v1.0.8)

### 🩹 Fixes

- Parsing of single-word ingredient ending with {} ([d130a4f](https://github.com/tmlmt/cooklang-parser/commit/d130a4f))
- Qtt info of referred ingredients is aggregated then lost ([f9830e1](https://github.com/tmlmt/cooklang-parser/commit/f9830e1))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v1.0.7

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.0.6...v1.0.7)

### 🩹 Fixes

- Parsing of cookware ([857b653](https://github.com/tmlmt/cooklang-parser/commit/857b653))

### 🏡 Chore

- **README:** Add link to docs, precise tests, and add future plans ([a4ec76e](https://github.com/tmlmt/cooklang-parser/commit/a4ec76e))
- **README:** Update future plans ([0c938f2](https://github.com/tmlmt/cooklang-parser/commit/0c938f2))

### ✅ Tests

- **recipe_parsing:** Move snapshots from inline to separate file ([2f3921a](https://github.com/tmlmt/cooklang-parser/commit/2f3921a))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v1.0.6

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.0.5...v1.0.6)

### 🏡 Chore

- Add release script ([36df049](https://github.com/tmlmt/cooklang-parser/commit/36df049))

### 🤖 CI

- Separate publish-npm and deploy-docs jobs ([a6ad2ed](https://github.com/tmlmt/cooklang-parser/commit/a6ad2ed))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v1.0.5

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.0.4...v1.0.5)

### 📖 Documentation

- Fix and add placeholders ([d30192e](https://github.com/tmlmt/cooklang-parser/commit/d30192e))

### 🏡 Chore

- **git:** Ignore vitepress and typedoc build files ([e6e5cb3](https://github.com/tmlmt/cooklang-parser/commit/e6e5cb3))
- **README:** Fix recipe parsing example ([4a95488](https://github.com/tmlmt/cooklang-parser/commit/4a95488))

### 🤖 CI

- Build and deploy docs ([8043d50](https://github.com/tmlmt/cooklang-parser/commit/8043d50))

## v1.0.4

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.0.3...v1.0.4)

### 📦 Build

- Produce both CommonJS and ESM ([b8d3608](https://github.com/tmlmt/cooklang-parser/commit/b8d3608))

### 🏡 Chore

- Fix endpoints in package.json ([935497a](https://github.com/tmlmt/cooklang-parser/commit/935497a))

## v1.0.3

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.0.2...v1.0.3)

### 🤖 CI

- Fix conflicting pnpm versions ([865c9f1](https://github.com/tmlmt/cooklang-parser/commit/865c9f1))
- Fix node-version ([82cf180](https://github.com/tmlmt/cooklang-parser/commit/82cf180))

## v1.0.2

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.0.1...v1.0.2)

### 🏡 Chore

- Add scope to package name ([dfd2f24](https://github.com/tmlmt/cooklang-parser/commit/dfd2f24))

### 🤖 CI

- Use pnpm/action-setup v4 and pnpm v10 ([154331b](https://github.com/tmlmt/cooklang-parser/commit/154331b))
- Setup node v22 with registry url for publishing ([d872be1](https://github.com/tmlmt/cooklang-parser/commit/d872be1))

## v1.0.1

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.0.0...v1.0.1)

### 🏡 Chore

- Fixed untracked files ([f458930](https://github.com/tmlmt/cooklang-parser/commit/f458930))

### 🤖 CI

- Ignore git checks ([2b67df8](https://github.com/tmlmt/cooklang-parser/commit/2b67df8))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v1.0.0

First release !
