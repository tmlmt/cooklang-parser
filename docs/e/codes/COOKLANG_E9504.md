---
code: COOKLANG_E9504
level: error(fatal)
title: Invalid pantry
---

## What this error means

`ShoppingList.addPantry()` received something other than a `Pantry` instance or a TOML string.

## How to fix it

```typescript
list.addPantry(new Pantry(tomlContent));
// or
list.addPantry(tomlContent);
```
