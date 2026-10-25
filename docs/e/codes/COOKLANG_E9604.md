---
code: COOKLANG_E9604
level: error(fatal)
title: No shopping list for cart
---

## What this error means

`ShoppingCart.buildCart()` was called before a shopping list was set.

## How to fix it

```typescript
cart.setProductCatalog(catalog);
cart.setShoppingList(list);
cart.buildCart();
```
