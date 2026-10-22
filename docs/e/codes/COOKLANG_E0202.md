---
code: COOKLANG_E0202
level: error
title: Referenced cookware not found
---

## What this error means

A piece of cookware was referenced with `#&name` but was not defined earlier in the recipe.

## Common causes

- The reference comes before the definition
- The names differ (spelling)

## How to fix it

```text
-- Wrong
Cook in #&pan
-- Correct
Heat the #pan, then cook in #&pan
```

Alternatively, drop the `&` to create a new entry.
