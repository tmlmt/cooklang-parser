---
code: COOKLANG_E0204
level: error
title: Referenced ingredient properties do not match
---

## What this error means

A reference (`&`) to an ingredient does not have exactly the same flags and preparation as any earlier declaration of that ingredient in the same recipe variant.

## Common causes

- `@&?flour{}` referencing a `@flour{}` declared without the optional flag
- `@&eggs{}(poached)` referencing `@eggs{}(boiled)`

## How to fix it

```text
-- Wrong
Mix @eggs{1}(boiled) and @&eggs{1}(poached).
-- Correct
Mix @eggs{1}(boiled) and @&eggs{1}(boiled).
```

Or remove the `&` to create a separate entry.
