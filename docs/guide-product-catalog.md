---
outline: deep
---

# Guide: product catalog syntax

`ProductCatalog` reads a TOML catalog that groups purchasable products by ingredient name. The format is intentionally compact, but it supports a few equivalent ways to describe the same product entries.

## Overview

At the top level, each TOML table is an ingredient name such as `eggs` or `flour`. Inside that table you can define:

- `aliases`: optional alternative ingredient names
- product entries: 
  - keys can be any string except the reserved `aliases` key
  - each entry must include `name`, `size`, and `price`. 
  - arbitrary extra metadata can also be defined


## Catalog shapes

You can write product entries in either canonical nested-table form or dotted-table form. Both parse to the same catalog.

### Canonical nested form

```toml
[eggs]
aliases = ["oeuf", "huevo"]
single = { name = "Single Egg", size = "1", price = 2 }
pack-6 = { name = "Pack of 6 eggs", size = "6", price = 10 }

[flour]
aliases = ["farine", "Mehl"]
01124 = { name = "Small pack", size = "100%g", price = 1.5 }
14141 = { name = "Big pack", size = "6%kg", price = 10, image = "flour.png" }
```

### Equivalent dotted-table form

```toml
[eggs.pack-6]
price = 10
name = "Pack of 6 eggs"
size = "6"

[eggs.single]
price = 2
name = "Single Egg"
size = "1"

[flour.big-pack]
price = 10
name = "Big pack"
size = "6%kg"

[flour.small-pack]
price = 1.5
name = "Small pack"
size = "100%g"
```

## Size syntax

The `size` field accepts either a single string or an array of strings.

Single sizes:

```toml
[eggs]
single = { name = "Single Egg", size = "1", price = 2 }
```

Sizes with a unit:

```toml
[flour]
small-pack = { name = "Small pack", size = "100%g", price = 1.5 }
```

Multiple equivalent sizes for the same product:

```toml
[eggs]
pack-of-12 = { name = "Pack of 12 eggs", size = ["1%dozen", "12"], price = 18 }
```

## Metadata and aliases

Any additional keys on a product entry are preserved as metadata when parsing and are written back when stringifying.

```toml
[flour]
small-pack = { name = "Small pack", size = "100%g", price = 1.5, image = "flour.png" }
```

`aliases` belongs on the ingredient table, not on the product entry. It is parsed as an array of alternate ingredient names:

```toml
[eggs]
aliases = ["oeuf", "huevo"]
single = { name = "Single Egg", size = "1", price = 2 }
```

## Full example

```typescript
import { ProductCatalog } from "@tmlmt/cooklang-parser";

const catalog = new ProductCatalog(`
[eggs]
aliases = ["oeuf", "huevo"]
01123 = { name = "Single Egg", size = "1", price = 2 }
11244 = { name = "Pack of 6 eggs", size = "6", price = 10 }

[flour]
aliases = ["farine", "Mehl"]
01124 = { name = "Small pack", size = "100%g", price = 1.5 }
14141 = { name = "Big pack", size = "6%kg", price = 10, image = "flour.png" }
`);

const eggs = catalog.products.find((product) => product.ingredientName === "eggs");
```

If you only need a compact reference, the API page for [ProductCatalog](/api/classes/ProductCatalog) links back here.