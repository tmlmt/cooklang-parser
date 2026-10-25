---
code: COOKLANG_W0201
level: warning
title: Duplicate ingredient without reference
---

## What this error means

An ingredient with the same name, flags and preparation was already defined earlier in the recipe, but it was added again without the reference symbol `&`. A new, separate entry was added instead of updating the existing one.

## Common causes

- The same ingredient is listed twice with identical flags and preparation, without noticing an earlier definition
- The `&` was forgotten when intending to add more of an existing ingredient

## How to fix it

```text
-- Wrong
Add @?salt{1%tsp}(ground), then add @?salt{2%tsp}(ground).
-- Correct
Add @?salt{1%tsp}(ground), then add @&?salt{2%tsp}(ground).
```

Or keep the new entry if two separate occurrences are intentional.
