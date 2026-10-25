---
code: COOKLANG_E9402
level: error(fatal)
title: Division by zero
---

## What this error means

A fraction in the recipe has a zero denominator, so its value is undefined.
The parser stops immediately rather than continuing with a partial parse.

## Common causes

- Writing a fraction such as `{1/0}`

## How to fix it

```text
-- Wrong
Add @flour{1/0}
-- Correct
Add @flour{1/2}
```

Use a nonzero denominator.

## Example output

```
error[COOKLANG_E1003]: A fraction cannot have a zero denominator.
```
