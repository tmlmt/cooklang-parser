---
code: COOKLANG_E9603
level: error(fatal)
title: No product catalog for cart
---

## What this error means

`ShoppingCart.buildCart()` was called before a product catalog was set.

## How to fix it

```typescript
cart.setProductCatalog(catalog);
cart.setShoppingList(list);
cart.buildCart();
```
