---
code: COOKLANG_E9401
level: error(fatal)
title: Ratio cannot be computed
---

## What this error means

The ratio between two quantities cannot be computed because one of them is not numeric. This aborts the whole `parse()`/`scaleBy()`/`convertTo()` call; it is not collected alongside other diagnostics.

## Common causes

- Merging equivalents where one of the equivalent quantities is text-only, e.g. `@flour{1%cup|a bit}` then `@&flour{2%cup|a lot}`

## How to fix it

Use numeric quantities for every equivalent that needs to be merged with another occurrence of the same ingredient.
