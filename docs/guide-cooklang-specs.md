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

## Metadata

Only metadata items of the [canonical metadata list](https://cooklang.org/docs/spec/#canonical-metadata) are parsed. Others are ignored. 
