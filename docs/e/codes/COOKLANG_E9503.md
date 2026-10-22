---
code: COOKLANG_E9503
level: error(fatal)
title: Unknown recipe path
---

## What this error means

`ShoppingList.hydrateRecipe()` was called with a path that is not referenced in the loaded shopping list file.

## Common causes

- The shopping list file was not loaded first, or the path is misspelled

## How to fix it

Call `loadFile()` first and use one of the returned reference paths.
