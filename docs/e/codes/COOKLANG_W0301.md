---
code: COOKLANG_W0301
level: warning
title: Servings is not a number
---

## What this error means

The `servings` or `serves` metadata is not numeric, so the recipe is scaled as if it made 1 serving.

## Common causes

- `servings: a few` or `serves: 4-6`

## How to fix it

```yaml
---
servings: 4
---
```

Use `yield` if you need a free-form description.
