# Changelog

## v3.0.0-alpha.28

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.27...v3.0.0-alpha.28)

### 🚀 Enhancements

- **recipe:** ⚠️  Make alternative choices variant-aware ([d01eaa0](https://github.com/tmlmt/cooklang-parser/commit/d01eaa0))

### 🏡 Chore

- **playground:** Pre-bundle deps to avoid page reloads ([85eeb89](https://github.com/tmlmt/cooklang-parser/commit/85eeb89))
- Lint ([c45ae10](https://github.com/tmlmt/cooklang-parser/commit/c45ae10))

#### ⚠️ Breaking Changes

- **recipe:** ⚠️  Make alternative choices variant-aware ([d01eaa0](https://github.com/tmlmt/cooklang-parser/commit/d01eaa0))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.27

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.26...v3.0.0-alpha.27)

### 🩹 Fixes

- **shopping-list:** Allow decimal servings ([40f797f](https://github.com/tmlmt/cooklang-parser/commit/40f797f))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.26

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.25...v3.0.0-alpha.26)

### 🚀 Enhancements

- Parse and serialize .shopping-list and .shopping-checked files ([1d5440d](https://github.com/tmlmt/cooklang-parser/commit/1d5440d))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.25

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.24...v3.0.0-alpha.25)

#### ⚠️ Breaking Changes

- The package now declares `engines.node >= 18` for further transparency and guidance to package managers. This will cause pnpm to reject installation on Node.js < 18. The build target is raised from ES2020 to ES2022, though the output remains identical as no ES2022-specific syntax is currently used.

### 📦 Build

- ⚠️ Align tsup target with tsconfig and add engines field ([a1d17b7](https://github.com/tmlmt/cooklang-parser/commit/a1d17b7))

### 🤖 CI

- Upgrade to Node 24 and bump GitHub Actions ([fa389a2](https://github.com/tmlmt/cooklang-parser/commit/fa389a2))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.24

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.23...v3.0.0-alpha.24)

### 🩹 Fixes

- **metadata:** Parse various time format for time metadata values as per convention ([a3f9377](https://github.com/tmlmt/cooklang-parser/commit/a3f9377))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.23

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.22...v3.0.0-alpha.23)

### 🩹 Fixes

- Parsing of list of objects in metadata ([f5bf3a8](https://github.com/tmlmt/cooklang-parser/commit/f5bf3a8))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.22

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.21...v3.0.0-alpha.22)

### 🩹 Fixes

- Multiple ingredients used as a single alternative were not grouped together ([b85e2e5](https://github.com/tmlmt/cooklang-parser/commit/b85e2e5))

### 📖 Documentation

- Move distinction between `servings` and `yield` to spec guide and improve metadata behavior description ([c93c60c](https://github.com/tmlmt/cooklang-parser/commit/c93c60c))
- Replace cooklang lang by yaml in code blocks ([369d8a1](https://github.com/tmlmt/cooklang-parser/commit/369d8a1))
- **formatNumericValue:** Correct default for useVulgar and corresponding examples ([849f1e7](https://github.com/tmlmt/cooklang-parser/commit/849f1e7))
- **isAlternativeSelected:** Fix parameter order in example ([ca1e78c](https://github.com/tmlmt/cooklang-parser/commit/ca1e78c))
- **index:** Many additional features ([47a33f5](https://github.com/tmlmt/cooklang-parser/commit/47a33f5))
- Add guide for rendering recipes ([0afaf97](https://github.com/tmlmt/cooklang-parser/commit/0afaf97))
- **guides:** Add paragraph about subgroup keys for grouped ingredients in extensions guide ([cabe8d6](https://github.com/tmlmt/cooklang-parser/commit/cabe8d6))
- Fix multiple inconsistencies ([4e59c67](https://github.com/tmlmt/cooklang-parser/commit/4e59c67))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.21

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.20...v3.0.0-alpha.21)

### 🩹 Fixes

- Handle Big objects in recipe.clone() ([b11d76d](https://github.com/tmlmt/cooklang-parser/commit/b11d76d))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.20

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.19...v3.0.0-alpha.20)

### 🩹 Fixes

- **servings:** Distinguish servings/serves (number) from yield (complex) ([aa6813f](https://github.com/tmlmt/cooklang-parser/commit/aa6813f))
- Various minor bugs and maximize test coverage along the way ([a494ee4](https://github.com/tmlmt/cooklang-parser/commit/a494ee4))
- **NoProductMatchError:** Missing backticks for 'noProduct' error code ([6e521c9](https://github.com/tmlmt/cooklang-parser/commit/6e521c9))
- **servings:** Do not throw errors for non-canonical values of servings, serves and yield. ([841b01a](https://github.com/tmlmt/cooklang-parser/commit/841b01a))

### 💅 Refactors

- **ShoppingList:** Move non-class-specific static functions to helpers file ([688fa46](https://github.com/tmlmt/cooklang-parser/commit/688fa46))

### 📖 Documentation

- **ProductCatalog:** Correct example to retrieve specific product ([21b50f7](https://github.com/tmlmt/cooklang-parser/commit/21b50f7))
- **playground:** Add yield in example recipe and dintinguish servings and serves in metadata render ([795ec5d](https://github.com/tmlmt/cooklang-parser/commit/795ec5d))
- **guides:** Add explanation for servings metadata variables ([4a2f44c](https://github.com/tmlmt/cooklang-parser/commit/4a2f44c))

### 🏡 Chore

- **test:** Update snapshots ([707b5b6](https://github.com/tmlmt/cooklang-parser/commit/707b5b6))
- Drop legacyDeepClone fallback ([f1bd9a2](https://github.com/tmlmt/cooklang-parser/commit/f1bd9a2))
- **quantities/alternatives:** Lint ([df020bf](https://github.com/tmlmt/cooklang-parser/commit/df020bf))

### ✅ Tests

- Remove snapshots too cumbersome to track over time ([318adbd](https://github.com/tmlmt/cooklang-parser/commit/318adbd))

### 🎨 Styles

- Rename parseQuantityInput to parseQuantityValue ([d57e68d](https://github.com/tmlmt/cooklang-parser/commit/d57e68d))
- **spec:** Reverse priority order between servings (higher) and serves (lower) ([cdf56c5](https://github.com/tmlmt/cooklang-parser/commit/cdf56c5))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.19

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.18...v3.0.0-alpha.19)

### 🏡 Chore

- Refresh lock file ([c1ac16e](https://github.com/tmlmt/cooklang-parser/commit/c1ac16e))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.18

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.17...v3.0.0-alpha.18)

### 🚀 Enhancements

- Recipe variants, and optional steps / sections ([0cafb0a](https://github.com/tmlmt/cooklang-parser/commit/0cafb0a))

### 📖 Documentation

- **API:** Remove non-public errors ([1b61f28](https://github.com/tmlmt/cooklang-parser/commit/1b61f28))
- **API:** Classify unclassified types and adds some context for better navigation ([40a853e](https://github.com/tmlmt/cooklang-parser/commit/40a853e))
- **API:** Fix wrong links in types docstrings ([fce51a2](https://github.com/tmlmt/cooklang-parser/commit/fce51a2))
- **guides:** Add variants and optional steps/sections to extension guide ([4963208](https://github.com/tmlmt/cooklang-parser/commit/4963208))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.17

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.16...v3.0.0-alpha.17)

### 🚀 Enhancements

- Allow grouped alternatives to replace multiple ingredients at once ([62feff4](https://github.com/tmlmt/cooklang-parser/commit/62feff4))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.16

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.15...v3.0.0-alpha.16)

### ⚠️ Breaking Changes

- The serving metadata properties (servings, yield, serves) are now parsed as `MetadataScalingVar`

### 🚀 Enhancements

- ⚠️ Allow customized units as servings metadata ([46dcde5](https://github.com/tmlmt/cooklang-parser/commit/46dcde5))

The serving metadata properties can now be expressed as:

- `<number>[, <text>]`
- `[<textBefore?>]<arbitraryScalable>[<textAfter?>]`

Examples:

- `2`
- `3, a few`
- `about {{1.2%kg}} of bread`

### 🏡 Chore

- **lint:** Do not initialize vars with values not read before reassignment ([6cd55ca](https://github.com/tmlmt/cooklang-parser/commit/6cd55ca))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.15

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.14...v3.0.0-alpha.15)

#### ⚠️ Breaking Changes

- New type structure for shopping list ingredients (AddedIngredient), aligned with that of recipe ingredients (Ingredient)

### 🚀 Enhancements

- Add pantry inventory management with recipe integration ([#98](https://github.com/tmlmt/cooklang-parser/pull/98))

### 🩹 Fixes

- **flattenPlainUnitGroup:** Do not mix standalone quantities and quantities from OR group ([#101](https://github.com/tmlmt/cooklang-parser/pull/101))

### 💅 Refactors

- **shoppingList:** ⚠️ Harmonize ingredients quantities between Ingredient and AddedIngredient ([#99](https://github.com/tmlmt/cooklang-parser/pull/99))

### 🏡 Chore

- **alternatives:** Remove useless variable expansion ([#100](https://github.com/tmlmt/cooklang-parser/pull/100))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.14

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.13...v3.0.0-alpha.14)

### 🚀 Enhancements

- **metadata:** Support yaml block scalar values for 'introduction' and 'description' ([8b12e60](https://github.com/tmlmt/cooklang-parser/commit/8b12e60))
- **parser:** Support for selected markdown elements in notes and steps ([9d3fe4f](https://github.com/tmlmt/cooklang-parser/commit/9d3fe4f))

### 🩹 Fixes

- **playground:** Update renderer after flattening of IngredientItem's itemQuantity ([0ac3f53](https://github.com/tmlmt/cooklang-parser/commit/0ac3f53))

### 🏡 Chore

- **index:** Add missing exports ([063afa3](https://github.com/tmlmt/cooklang-parser/commit/063afa3))
- **playground:** Add a multiline description field in the example recipe for demo purposes ([1ff847f](https://github.com/tmlmt/cooklang-parser/commit/1ff847f))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.13

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.12...v3.0.0-alpha.13)

#### ⚠️ Breaking Changes

- **Metadata interface restructured.**

Source attribution:

    - metadata["source.name"] → metadata.source?.name (when source is object)
    - metadata["source.url"] → metadata.source?.url (when source is object)
    - metadata["source.author"] → metadata.source?.author (when source is object)

Simple string source remains: metadata.source (when string)

Time information:

    - metadata["prep time"] / metadata["time.prep"] → metadata.time?.prep
    - metadata["cook time"] / metadata["time.cook"] → metadata.time?.cook

- **ShoppingList public API renamed to camelCase.**

Migrate by updating method calls:

    .add_recipe() → .addRecipe()
    .remove_recipe() → .removeRecipe()
    .set_category_config() → .setCategoryConfig()
    .category_config → .categoryConfig

### 🚀 Enhancements

- Allow custom metadata fields ([bd40101](https://github.com/tmlmt/cooklang-parser/commit/bd40101))

### 🩹 Fixes

- **convertTo:** Keep old primary quantity when an equivalent was used to convert, in 'replace' mode ([c1be26e](https://github.com/tmlmt/cooklang-parser/commit/c1be26e))

### 💅 Refactors

- ⚠️ Harmonize method naming to camelCase ([327a2c2](https://github.com/tmlmt/cooklang-parser/commit/327a2c2))
- ⚠️ Restructure Metadata interface with nested source and time objects ([1b239e7](https://github.com/tmlmt/cooklang-parser/commit/1b239e7))

### 🏡 Chore

- **test:** Maximize coverage ([210006a](https://github.com/tmlmt/cooklang-parser/commit/210006a))
- Remove unused import ([5c91fc4](https://github.com/tmlmt/cooklang-parser/commit/5c91fc4))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.12

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.11...v3.0.0-alpha.12)

#### ⚠️ Breaking Changes

The `IngredientAlternative` type (cf `IngredientItem.alternatives: IngredientAlternative[]`) no longer has an
itemQuantity property. The quantity, unit, scalable, and equivalents
fields are now directly on the IngredientAlternative object.

Before:

- alternative.itemQuantity?.quantity
- alternative.itemQuantity?.unit
- alternative.itemQuantity?.scalable
- alternative.itemQuantity?.equivalents

After:

- alternative.quantity
- alternative.unit
- alternative.scalable
- alternative.equivalents

When an alternative has no quantity, these fields are undefined/absent
rather than itemQuantity being undefined.

### 💅 Refactors

- **types:** ⚠️ Flatten IngredientItemQuantity into IngredientAlternative ([2ff869d](https://github.com/tmlmt/cooklang-parser/commit/2ff869d))

### 📖 Documentation

- **reference-units:** Correct values in units configuration table ([55c2914](https://github.com/tmlmt/cooklang-parser/commit/55c2914))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.11

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.10...v3.0.0-alpha.11)

#### ⚠️ Breaking Changes

- **units:** ⚠️ When added or scaled, the best unit is found and applied to the all resulting quantities, potentially taking into account a user-defined unit system in the recipe frontmatter. Previously, the original unit was maintained or compatible units where possibly merging into metric units.

### 🚀 Enhancements

- Enhance handling of unit systems and cover metric, UK, US and JP units ([487cdcd](https://github.com/tmlmt/cooklang-parser/commit/487cdcd))
- **units:** ⚠️ Improve unit system and quantity additions ([#95](https://github.com/tmlmt/cooklang-parser/pull/95))
- Full-recipe unit conversion ([#97](https://github.com/tmlmt/cooklang-parser/pull/97))

### 🏡 Chore

- **vitest:** Do not run coverage by default ([fcd2302](https://github.com/tmlmt/cooklang-parser/commit/fcd2302))
- **gitignore:** Ignore copilot instructions file ([8d73c9e](https://github.com/tmlmt/cooklang-parser/commit/8d73c9e))
- **package:** Update test:ui script to include coverage ([333c902](https://github.com/tmlmt/cooklang-parser/commit/333c902))
- **playground:** Remove passing of invalid prop in IngredientItem ([#96](https://github.com/tmlmt/cooklang-parser/pull/96))
- **docs:** Move eslint-disable-next-line to the new right place ([288c1e9](https://github.com/tmlmt/cooklang-parser/commit/288c1e9))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.10

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.9...v3.0.0-alpha.10)

### 🚀 Enhancements

- Add multiple type-guard and render helper functions ([05584f5](https://github.com/tmlmt/cooklang-parser/commit/05584f5))

  List of functions introduced:
  - isAlternativeSelected
  - isGroupedItem
  - formatNumericValue
  - formatSingleValue
  - formatQuantity
  - formatUnit
  - formatQuantityWithUnit
  - formatExtendedQuantity
  - formatItemQuantity
  - isAndGroup
  - isSimpleGroup
  - hasAlternatives

### 🩹 Fixes

- **isAlternativeSelected:** Return true for first alternative when selected index is 0 ([4e9b1dd](https://github.com/tmlmt/cooklang-parser/commit/4e9b1dd))
- **docs, v3:** Link to playground in top menubar ([361a676](https://github.com/tmlmt/cooklang-parser/commit/361a676))

### 🏡 Chore

- **CHANGELOG:** Fix missing end of code block ([00f27b3](https://github.com/tmlmt/cooklang-parser/commit/00f27b3))

### 🎨 Styles

- **types:** Remove unnecessary ComputedIngredient type ([f35f2f0](https://github.com/tmlmt/cooklang-parser/commit/f35f2f0))
- **types:** Make IngredientQuantityAndGroup extend AndGroup ([6647039](https://github.com/tmlmt/cooklang-parser/commit/6647039))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.9

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.8...v3.0.0-alpha.9)

### ⚠️ Breaking Changes

- **types:** ⚠️ Flatten And & Or groups by directly using and/or as property name ([ec80478](https://github.com/tmlmt/cooklang-parser/commit/ec80478))

Before:

```
{
    type: "or", // or "and"
    entries: [ ... ]
}
```

After:

```
{
    or: [ ... ] // or and: [ ... ]
}
```

### 🚀 Enhancements

- **Recipe:** New universal `getIngredientQuantities` method to filter by section, step and/or user choices ([04e61f6](https://github.com/tmlmt/cooklang-parser/commit/04e61f6))
- **ShoppingList:** Enhance ingredient handling with AND groups and ensure choices are provided for recipes with alternatives ([f5ef123](https://github.com/tmlmt/cooklang-parser/commit/f5ef123))
- **Helpers:** Add isAlternativeSelected function to determine selected ingredient alternatives ([2c5af2a](https://github.com/tmlmt/cooklang-parser/commit/2c5af2a))

### 📖 Documentation

- **Recipe:** Fix description of `choices` property ([b9169ac](https://github.com/tmlmt/cooklang-parser/commit/b9169ac))
- **playground:** Dynamically render user choices for alternatives ingredients ([2eea3c0](https://github.com/tmlmt/cooklang-parser/commit/2eea3c0))

### 🎨 Styles

- **types:** ⚠️ Flatten And & Or groups by directly using and/or as property name ([ec80478](https://github.com/tmlmt/cooklang-parser/commit/ec80478))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.8

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.7...v3.0.0-alpha.8)

### 📖 Documentation

- **v3, home:** Fix link to playground ([08262a5](https://github.com/tmlmt/cooklang-parser/commit/08262a5))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.7

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.6...v3.0.0-alpha.7)

### 🏡 Chore

- Refresh lock files ([393cbae](https://github.com/tmlmt/cooklang-parser/commit/393cbae))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.6

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.5...v3.0.0-alpha.6)

### 📖 Documentation

- **playground:** Fix missing display of units and equivalents ([89b300e](https://github.com/tmlmt/cooklang-parser/commit/89b300e))
- **playground:** Bump all deps ([c143a28](https://github.com/tmlmt/cooklang-parser/commit/c143a28))
- **playground:** Add Choices tab to play with scaling ([1babbd5](https://github.com/tmlmt/cooklang-parser/commit/1babbd5))
- **v3, home:** Fix link to playground ([89b9ae5](https://github.com/tmlmt/cooklang-parser/commit/89b9ae5))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.5

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.4...v3.0.0-alpha.5)

### 🚀 Enhancements

- Add arbitrary scalable quantities ([#92](https://github.com/tmlmt/cooklang-parser/pull/92))
- **playground:** Add GitHub and docs links to header ([#94](https://github.com/tmlmt/cooklang-parser/pull/94))

### 🩹 Fixes

- **numeric:** Lack of rounding due to incorrect detection of long decimal as a fraction ([cbd4f5e](https://github.com/tmlmt/cooklang-parser/commit/cbd4f5e))
- **scaling:** Default servings 1 if no servings defined ([13efe7a](https://github.com/tmlmt/cooklang-parser/commit/13efe7a))

### 📖 Documentation

- Add links to playground ([186d254](https://github.com/tmlmt/cooklang-parser/commit/186d254))
- Fix link in banner and refactor version links ([5302155](https://github.com/tmlmt/cooklang-parser/commit/5302155))
- **extensions:** Refine wording and update ingredient alias example ([#93](https://github.com/tmlmt/cooklang-parser/pull/93))
- **playground:** Add page title and description ([322b6bb](https://github.com/tmlmt/cooklang-parser/commit/322b6bb))

### 🏡 Chore

- **pull_requests_template:** Various improvements ([79bfa9a](https://github.com/tmlmt/cooklang-parser/commit/79bfa9a))

### 🎨 Styles

- **types:** Remove unnecessary layer 'groupQuantity' and rename alternativeQuantities into 'quantities' ([#91](https://github.com/tmlmt/cooklang-parser/pull/91))
- **docs-v3:** Fix banner and header overlap on mobile ([94227bf](https://github.com/tmlmt/cooklang-parser/commit/94227bf))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.4

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.3...v3.0.0-alpha.4)

### 🩹 Fixes

- **playground:** Use absolute url on pre-release banner too ([4719ff9](https://github.com/tmlmt/cooklang-parser/commit/4719ff9))

### 📖 Documentation

- **playground:** Add color mode and improve header style ([844a00c](https://github.com/tmlmt/cooklang-parser/commit/844a00c))
- **playground:** Improve color palette for dark mode ([0e4127c](https://github.com/tmlmt/cooklang-parser/commit/0e4127c))
- **playground:** Propose better showcase recipe ([01c9032](https://github.com/tmlmt/cooklang-parser/commit/01c9032))
- **playground:** Various rendering fixes ([7d46ece](https://github.com/tmlmt/cooklang-parser/commit/7d46ece))
- Fix build by moving constants to a separate file and avoid bundler crash ([5a51c06](https://github.com/tmlmt/cooklang-parser/commit/5a51c06))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.3

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.2...v3.0.0-alpha.3)

### 🩹 Fixes

- **playground:** Use absolute urls to enable navigation between major version in production ([bbcadfa](https://github.com/tmlmt/cooklang-parser/commit/bbcadfa))

### 💅 Refactors

- **types:** Replace IngredientQuantities type with explicit union ([17454b6](https://github.com/tmlmt/cooklang-parser/commit/17454b6))

### 📖 Documentation

- **playground:** Get version number from parser package ([cc945e0](https://github.com/tmlmt/cooklang-parser/commit/cc945e0))

### 🏡 Chore

- **playground:** Remove package version and add description ([e56ed20](https://github.com/tmlmt/cooklang-parser/commit/e56ed20))

### 🤖 CI

- **deploy-playground:** Add base url via env variable ([ffde4d5](https://github.com/tmlmt/cooklang-parser/commit/ffde4d5))
- **publish-npm:** Disable git checks to enable publishing from any branch or tag ([6ac3594](https://github.com/tmlmt/cooklang-parser/commit/6ac3594))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.2

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.1...v3.0.0-alpha.2)

### 📖 Documentation

- **types:** Include IngredientItemQuantity ([c0573b2](https://github.com/tmlmt/cooklang-parser/commit/c0573b2))

### 🏡 Chore

- Refresh pnpm-lock file ([664dd37](https://github.com/tmlmt/cooklang-parser/commit/664dd37))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.1

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v3.0.0-alpha.0...v3.0.0-alpha.1)

### 🏡 Chore

- **ci:** Remove obsolete git-checks config from .npmrc ([e96f3e1](https://github.com/tmlmt/cooklang-parser/commit/e96f3e1))

### 🤖 CI

- **publish-npm:** Add pre-release tag when publishing pre-releases on npm ([b43470f](https://github.com/tmlmt/cooklang-parser/commit/b43470f))
- Add deployment of playground ([cf42d0c](https://github.com/tmlmt/cooklang-parser/commit/cf42d0c))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v3.0.0-alpha.0

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v2.1.7...v3.0.0-alpha.0)

### 🚀 Enhancements

- New class `ShoppingCart` to assing ingredients in a shopping list to products from a catalog ([#83](https://github.com/tmlmt/cooklang-parser/pull/83))
- ⚠️ Alternative units and ingredients ([#80](https://github.com/tmlmt/cooklang-parser/pull/80))

### 📖 Documentation

- Generate and deploy for both v2 and v3 ([#85](https://github.com/tmlmt/cooklang-parser/pull/85))
- Add playground ([#82](https://github.com/tmlmt/cooklang-parser/pull/82))

### 🏡 Chore

- **README:** Bump year to 2026 ([b45e021](https://github.com/tmlmt/cooklang-parser/commit/b45e021))
- Remove patched version of human-regex use new v2.2.0 instead ([#84](https://github.com/tmlmt/cooklang-parser/pull/84))

### 🤖 CI

- **release:** Publish release with pre-release tag for pre-release version numbers ([#86](https://github.com/tmlmt/cooklang-parser/pull/86))
- **release:** Enable providing a specific release version number ([a957dee](https://github.com/tmlmt/cooklang-parser/commit/a957dee))

#### ⚠️ Breaking Changes

- ⚠️ Alternative units and ingredients ([#80](https://github.com/tmlmt/cooklang-parser/pull/80))

This new major feature completely restructures the Recipe `sections` and `ingredients` properties resulting from parsing recipes. Refer to the documentation (work in progress for details)

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v2.1.7

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v2.1.6...v2.1.7)

### 🩹 Fixes

- **regex:** Do not capture ending dot following a quantity-less ingredient or cookware ([#81](https://github.com/tmlmt/cooklang-parser/pull/81))
- **regex:** All whitespaces around comment block removed on both sides ([f883901](https://github.com/tmlmt/cooklang-parser/commit/f883901))
- **parser:** Section names not parsed correctly with multiple = delimiters ([bd0ea97](https://github.com/tmlmt/cooklang-parser/commit/bd0ea97))

### 🏡 Chore

- Add PR template ([c9fd31d](https://github.com/tmlmt/cooklang-parser/commit/c9fd31d))

### 🤖 CI

- Ignore graphite-base branches ([a24b455](https://github.com/tmlmt/cooklang-parser/commit/a24b455))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v2.1.6

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v2.1.5...v2.1.6)

### 🤖 CI

- **npm:** Bump npm to v11 required by OICD ([79c6d50](https://github.com/tmlmt/cooklang-parser/commit/79c6d50))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v2.1.5

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v2.1.4...v2.1.5)

### 📖 Documentation

- Fix link to Examples section on index page ([#72](https://github.com/tmlmt/cooklang-parser/pull/72))

### 🏡 Chore

- **README:** Replace list of backlog items by link to up-to-date Issues page ([1bdada8](https://github.com/tmlmt/cooklang-parser/commit/1bdada8))
- **README:** Refer to Conventional Commits when submitting PRs ([a2f6a28](https://github.com/tmlmt/cooklang-parser/commit/a2f6a28))

### 🤖 CI

- **npm:** Adjust permissions to work with Trusted publishing ([c915078](https://github.com/tmlmt/cooklang-parser/commit/c915078))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))
- Helge ([@HelgeKrueger](https://github.com/HelgeKrueger))

## v2.1.4

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v2.1.3...v2.1.4)

### 🩹 Fixes

- **scaleTo:** Floating point inacurracies when proving a repeating decimal fraction ([#68](https://github.com/tmlmt/cooklang-parser/pull/68))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v2.1.3

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v2.1.2...v2.1.3)

### 📖 Documentation

- **guide-units:** Add centiliters and deciliters ([35ad521](https://github.com/tmlmt/cooklang-parser/commit/35ad521))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v2.1.2

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v2.1.1...v2.1.2)

### 🩹 Fixes

- **units:** Add centiliters and deciliters ([3ad9c5f](https://github.com/tmlmt/cooklang-parser/commit/3ad9c5f))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v2.1.1

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v2.1.0...v2.1.1)

This version fixes a bug where the addition or multiplication of certain floating-point numbers led to inaccurate results e.g. 1.1 + 1.3 = 2.4000000000000004

### 🩹 Fixes

- Addition and multiplication of floating-point quantities ([#49](https://github.com/tmlmt/cooklang-parser/pull/49))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v2.1.0

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v2.0.2...v2.1.0)

### 🚀 Enhancements

- **ShoppingList:** Add a recipe with either a factor or a number of servings for scaling ([#45](https://github.com/tmlmt/cooklang-parser/pull/45))

### 🕰️ Deprecations

- **ShoppingList:** the call signature `add_recipe(recipe: Recipe, factor?: number)` is now deprecated and will be removed in v3. Use `add_recipe(recipe: Recipe, scaling?: { factor: number } | { servings: number })` instead.

### 🤖 CI

- **release:** Re-extract possibly edited changelog for use in release notes ([4468cf9](https://github.com/tmlmt/cooklang-parser/commit/4468cf9))

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

## v2.0.2

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v2.0.1...v2.0.2)

### 🩹 Fixes

- Non-quantified ingredients parsed with a quantityPartIndex of 0 ([0c59df1](https://github.com/tmlmt/cooklang-parser/commit/0c59df1))

### 🏡 Chore

- **README:** Update future plans ([4d1d229](https://github.com/tmlmt/cooklang-parser/commit/4d1d229))

### ❤️ Contributors

- Thomas Lamant <tom@tmlmt.com>

## v2.0.1

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v2.0.0...v2.0.1)

This release is due to a version conflict caused by the faulty release of v1.2.0 a couple of month ago which was accidentally published as 2.0.0 on npm

The opportunity was taken to update all dependencies to their latest patch versions.

## v2.0.0

[compare changes](https://github.com/tmlmt/cooklang-parser/compare/v1.4.4...v2.0.0)

### 🚀 Enhancements

- **spec:** ⚠️ Fixed quantities ([#30](https://github.com/tmlmt/cooklang-parser/pull/30))
- ⚠️ Allow multiple flags for ingredients and cookware ([#36](https://github.com/tmlmt/cooklang-parser/pull/36))
- Referencing other recipes as per spec ([4923725](https://github.com/tmlmt/cooklang-parser/commit/4923725))

### 🩹 Fixes

- Test for complex scaling metadata and improve associated docs ([4f51f62](https://github.com/tmlmt/cooklang-parser/commit/4f51f62))
- **build:** Correctly setup pinned version of pnpm in proto ([8d4bbc3](https://github.com/tmlmt/cooklang-parser/commit/8d4bbc3))
- Quantities of referenced cookware are not added up ([#31](https://github.com/tmlmt/cooklang-parser/pull/31))
- Non numeric scaling metadata scales due to parseFloat capturing a number ([e956df2](https://github.com/tmlmt/cooklang-parser/commit/e956df2))

### 💅 Refactors

- ⚠️ Use indexes for cookware quantities and quantity parts ([#34](https://github.com/tmlmt/cooklang-parser/pull/34))

### 📖 Documentation

- **guide-extensions:** Adjust to latest API changes ([d1fc4f9](https://github.com/tmlmt/cooklang-parser/commit/d1fc4f9))
- **scaling:** Clarify which quantities are scaled ([7aab5ad](https://github.com/tmlmt/cooklang-parser/commit/7aab5ad))
- Expose IngredientFlag, IngredientExtras and CookwareFlag in the API reference ([0af8175](https://github.com/tmlmt/cooklang-parser/commit/0af8175))

### 📦 Build

- Bump pnpm to v10.19.0 ([b6ac5e3](https://github.com/tmlmt/cooklang-parser/commit/b6ac5e3))

### 🏡 Chore

- Configure Renovate ([#12](https://github.com/tmlmt/cooklang-parser/pull/12))

### ✅ Tests

- Maximize coverage by ignoring else path when irrelevant ([f99b59c](https://github.com/tmlmt/cooklang-parser/commit/f99b59c))

### 🎨 Styles

- Do not refer to single unit as units in the plural ([a7a2c6d](https://github.com/tmlmt/cooklang-parser/commit/a7a2c6d))
- **TimerItem:** ⚠️ Rename `value` property to `index` ([be4ff38](https://github.com/tmlmt/cooklang-parser/commit/be4ff38))

#### ⚠️ Breaking Changes

- **Ingredient**: `hidden`, `optional` and `recipe` are now grouped into the `flags` ingredients array property instead of being ingredients individual boolean properties
- **CookwareItem**: `value` is renamed into `index` and the item specific quantity of cookware is now an index `quantityPartIndex` referring to the array of quantity parts added to the overall cookware list.
- **IngredientItem**: specific quantities are no longer included in whole, but referred to by a new index in property `quantityPartIndex` and are stored within the recipes ingredient list; the property containing the ingredient index is also renamed from `value` to `index`. See the updated API docs for the details.
- **TimerItem:** `value` property renamed into `index`

### ❤️ Contributors

- Thomas Lamant ([@tmlmt](https://github.com/tmlmt))

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

- **README:** remove details about extensions and refer to docs ([43419c6](https://github.com/tmlmt/cooklang-parser/commit/43419c6))

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
