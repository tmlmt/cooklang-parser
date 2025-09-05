---
outline: deep
---

# Guide: language extensions

This parser library introduces multiple extensions of the original [cooklang language](/api/guide-cooklang-specs). Most of them are directly inspired by / in line with the extensions proposed by the official ([cooklang-rs](https://github.com/cooklang/cooklang-rs/blob/main/extensions.md)) Rust parser.

## Modifiers

- `@`: referenced recipe
- `&`: referenced ingredient (quantities will be added)
- `-`: hidden ingredient
- `?`: optional ingredient
- All but `@` also work with Cookware

## Range values
   
- `@eggs{2-4}` will show eggs as an ingredient with a quantity range of 2 to 4
- `@water{1%L} and @&water{1/4-1/2%L}` will show water as an ingredient with a quantity range of 1.25 to 1.5 L
- Also works with Cookware and Timers
  
## Cookware quantities

- Cookware can also be quantified (without any unit, e.g. `#bowls{2}`)
- Quantities will be added if cookware are referenced, e.g. `#&bowls{2}`

## Ingredient aliases

- `@ingredientName|displayAlias{}` will add the ingredient as "ingredientName" in the ingredients list, but will display is as "displayAlias" in the preparation step.
- Also work with referencing etc., e.g. `Mix @wheat flour{100%g} with additional @&wheat flour|flour{50%g}` enables to get 150g of wheat flour in the ingredients list, and let you display "Mix wheat flour (100 g) with additional flour (50 g)" in your recipe renderer.