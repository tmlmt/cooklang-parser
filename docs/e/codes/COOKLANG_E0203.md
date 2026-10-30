---
code: COOKLANG_E0203
level: error
title: Referenced cookware flags do not match
---

## What this error means

A reference (`&`) to a cookware does not have exactly the same flags (hidden `-` or optional `?`) as any earlier declaration of that cookware in the same recipe variant.

## Common causes

- `#&?pan` referencing a `#pan` declared without the optional flag
- `#&pan` referencing a `#?pan` declared with the optional flag

## How to fix it

```text
-- Wrong
Use #pan, then #&?pan.
-- Correct (same flags)
Use #?pan, then #&?pan.
```

Or remove the `&` to create a separate entry with different flags.
