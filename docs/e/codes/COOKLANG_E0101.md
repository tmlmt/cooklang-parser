---
code: COOKLANG_E0101
level: error
title: Invalid quantity
---

## What this error means

A quantity written inside `{…}` could not be understood as a number, a range or a fraction.

## Common causes

- A typo such as `{%two}` or `{3x}`
- A range or fraction that is incomplete, e.g. `{3-}` or `{1/}`

## How to fix it

```text
-- Wrong
Add @flour{%two}
-- Correct
Add @flour{2%cups}
```

Use a number (`3`), a range (`1-2`) or a fraction (`1/2`).

## Example output

```
error[COOKLANG_E0101]: Invalid quantity format: "%two"
```
