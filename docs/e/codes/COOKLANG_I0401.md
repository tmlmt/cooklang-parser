---
code: COOKLANG_I0401
level: error(internal)
title: Incompatible units
---

## What this error means

Two quantities with incompatible or unknown units were merged together, e.g. grams and litres. Every public call path that merges quantities pre-filters by compatible unit type before this can happen, so you should not be able to trigger this from recipe text, a pantry, a shopping list or a product catalog. This is a bug in `@tmlmt/cooklang-parser`, not a problem with your input.

## How to fix it

Please [open an issue](https://github.com/tmlmt/cooklang-parser/issues) with a minimal input that reproduces the error.
