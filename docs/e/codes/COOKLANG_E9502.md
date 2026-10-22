---
code: COOKLANG_E9502
level: error(fatal)
title: Index out of bounds
---

## What this error means

An index passed to a `ShoppingList` method does not exist.

## Common causes

- Removing a recipe or manual item with an index that is negative or too large

## How to fix it

Use an index between `0` and the number of items minus one.
