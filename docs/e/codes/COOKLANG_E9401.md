---
code: COOKLANG_E9401
level: error(fatal)
title: Text quantity cannot be added
---

## What this error means

A quantity with a text value (e.g. `a pinch`) cannot be added to another quantity. This aborts the whole `parse()`/`scaleBy()`/`convertTo()` call; it is not collected alongside other diagnostics.

## Common causes

- The same ingredient (without alternatives) appears more than once, once with a text quantity and once with a numeric quantity of a compatible unit, e.g. `@salt{a pinch%tsp}` then `@&salt{2%tsp}`

## How to fix it

Use numeric quantities throughout when the same ingredient's quantities need to be summed, or use `&`-less separate entries / alternatives if they are not meant to be added together.
