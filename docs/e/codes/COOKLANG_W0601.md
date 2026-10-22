---
code: COOKLANG_W0601
level: warning
title: No product match
---

## What this error means

An ingredient of the shopping list could not be matched to a product of the catalog. The `reason` property of the error tells why: `noProduct`, `noQuantity`, `textValue`, `incompatibleUnits` or `textValue_incompatibleUnits`.

## Common causes

- No product is linked to the ingredient name or alias
- The ingredient has no quantity, or a text quantity
- No product has units compatible with the ingredient

## How to fix it

Add a product with compatible units to the catalog. `ShoppingCart.buildCart()` does not throw for this: unmatched ingredients are listed in `cart.misMatch`.
