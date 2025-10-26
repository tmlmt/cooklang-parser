---
outline: deep
---

# Guide: cooklang specifications

This parser library is fully compliant with the Cooklang Specifications that you can read in detail [here](https://cooklang.org/docs/spec/) on _cooklang.org_. 

Below are a few details about some behavioral aspects.

## Ingredients

- For single-word ingredients, the curly braces are optional. For instance, both `@eggs` and `@eggs{}` will be recognized as ingredient "eggs"

- Fractions as quantities will be preserved. For instance, `@water{1/2%L}` will be have its quantity parsed as:

```json
{ type: "fixed", value: {num: 1, den: 2, type: "fraction"}}
```

###  Fixed quantities

Prefixing an ingredient's quantity with `=` will prevent it from scaling. For example, when writing `@salt{1%pinch}`, salt will always stay at 1 pinch regardless of serving size. 

This does not work with cookware or timers which do not scale anyway.

### Referencing other recipes

It is understood from the [spec](https://cooklang.org/docs/spec/#referencing-other-recipes) that other recipes can be referenced as ingredients by prefixing them with `./` and providing their relative path. For example, `@./sauces/Hollandaise{150%g}`. 

This parser: 
- captures the name of the recipe,
- adds a `recipe` flag to the `flags` array property of the ingredient
- and adds the full relative path including the .cook extension, to the `extras` property of the ingredient.

The above example would therefore result in the following [`Ingredient`](/api/interfaces/Ingredient.html) entry:
```ts
{ 
  name: "Hollandaise",
  quantity: { type: "fixed", value: { type: "decimal", value: 150 } },
  unit: "g",
  quantityParts: [value: { type: "fixed", value: { type: "decimal", value: 150 } }, unit: "g", scalable: true]
  flags: ["recipe"],
  extras: { path: "sauces/Hollandaise.cook" }
}
```

## Metadata

Only metadata items of the [canonical metadata list](https://cooklang.org/docs/spec/#canonical-metadata) are parsed. Others are ignored. 
