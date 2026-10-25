---
code: COOKLANG_W0701
level: warning
title: Ingredient without category
---

## What this error means

An ingredient line appears before any `[category]` header in a category configuration.

## How to fix it

```
-- Wrong
flour
[Dairy]
milk
-- Correct
[Baking]
flour
[Dairy]
milk
```
