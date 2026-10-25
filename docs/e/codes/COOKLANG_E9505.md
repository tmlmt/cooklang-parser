---
code: COOKLANG_E9505
level: error(fatal)
title: Invalid category configuration
---

## What this error means

`ShoppingList.setCategoryConfig()` received something other than a `CategoryConfig` instance or a string.

## How to fix it

```typescript
list.setCategoryConfig(new CategoryConfig(configText));
// or
list.setCategoryConfig(configText);
```
