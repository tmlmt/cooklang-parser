---
code: COOKLANG_W0401
level: warning
title: Text quantities kept separate
---

## What this warning means

A numeric quantity and a text-valued quantity were found for the same ingredient. They cannot be added together, so they are kept separate.

## Common causes

- Referencing an ingredient with both a numeric quantity and a descriptive quantity, such as `@salt{2}` and `@&salt{a pinch}`, or `@salt{2%g}` and `@&salt{a pinch}`

## How to fix it

No change is needed if both quantities are intentional; they remain available separately. If they should be summed, use numeric quantities for both.