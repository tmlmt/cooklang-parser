---
code: COOKLANG_E0201
level: error
title: Referenced ingredient not found
---

## What this error means

An ingredient was referenced with `@&name` but no ingredient with that name was defined earlier in the recipe.

## Common causes

- The reference comes before the definition
- The names differ (spelling)

## How to fix it

```text
-- Wrong
Add @&flour{100%g}
-- Correct
Mix @flour{200%g}, then add @&flour{100%g}
```

Alternatively, drop the `&` to create a new entry.
