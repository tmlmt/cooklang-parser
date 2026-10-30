---
code: COOKLANG_W0202
level: warning
title: Duplicate cookware without reference
---

## What this error means

A cookware with the same name and flags was already defined earlier in the recipe (in the same variant), but it was added again without the reference symbol `&`. A new, separate entry was added instead of referencing the existing one.

## Common causes

- The same cookware is listed twice with identical flags, without noticing an earlier definition
- The `&` was forgotten when intending to reuse an existing cookware

## How to fix it

```text
-- Wrong
Use #?pan, then use #?pan again.
-- Correct
Use #?pan, then use #&?pan again.
```

Or keep the new entry if two separate occurrences are intentional.
