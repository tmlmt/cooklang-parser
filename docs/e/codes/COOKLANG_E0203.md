---
code: COOKLANG_E0203
level: error
title: Referenced item redefined
---

## What this error means

A reference (`&`) to an ingredient or cookware tries to add a flag (such as hidden `-`, optional `?` or recipe `@`) that the original definition does not have.

## Common causes

- `@&flour{}` combined with a flag that `@flour{}` was not defined with

## How to fix it

```text
-- Wrong
@flour{200%g} then @&?flour{100%g}
-- Correct (add the flag to the original definition)
@?flour{200%g} then @&?flour{100%g}
```

Or remove the `&` to create a separate entry with the flag.
