---
code: COOKLANG_E0102
level: error
title: Timer missing unit
---

## What this error means

A timer has a duration but no unit, so the parser cannot tell how long it lasts.

## Common causes

- Writing `~{5}` instead of `~{5%minutes}`

## How to fix it

```text
-- Wrong
Cook for ~{5}
-- Correct
Cook for ~{5%minutes}
```
