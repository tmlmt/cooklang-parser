# Cooklang Parser

A typescript library to parse and manipulate [cooklang](https://cooklang.org/) recipes.

## Introduction

This library provides a set of tools to work with recipes written in the Cooklang format. It allows you to parse recipes, extract ingredients, cookware, and timers, scale recipes, and generate shopping lists.

The documentation is available at [https://cooklang-parser.tmlmt.com](https://cooklang-parser.tmlmt.com) (work in progress)

## Features

- **Cooklang Compliant:** Fully compliant with the Cooklang specifications.
- **Recipe Parsing:** Parse Cooklang recipes to extract metadata, ingredients, cookware, timers, and steps. Several extensions on top of the original cooklang specifications:
  - **Useful modifiers:** in line with the same in the canonical cooklang parser in Rust ([cooklang-rs](https://github.com/cooklang/cooklang-rs/blob/main/extensions.md))
    - `@`: referenced recipe
    - `&`: referenced ingredient (quantities will be added)
    - `-`: hidden ingredient
    - `?`: optional ingredient
    - All but `@` also work with Cookware
  - **Range values:**
    - `@eggs{2-4}` will show eggs as an ingredient with a quantity range of 2 to 4
    - `@water{1%L} and @&water{1/4-1/2%L}` will show water as an ingredient with a quantity range of 1.25 to 1.5 L
    - Also works with Cookware and Timers
  - **Cookware quantities:**
    - Cookware can also be quantified (without any unit, e.g. `#bowls{2}`)
    - Quantities will be added if cookware are referenced, e.g. `#&bowls{2}`
  - **Ingredient aliases:**
    - `@ingredientName|displayAlias{}` will add the ingredient as "ingredientName" in the ingredients list, but will display is as "displayAlias" in the preparation step.
    - Also work with referencing etc., e.g. `Mix @wheat flour{100%g} with additional @&wheat flour|flour{50%g}` enables to get 150g of wheat flour in the ingredients list, and let you display "Mix wheat flour (100 g) with additional flour (50 g)" in your recipe renderer.
- **Recipe Scaling:** Scale recipes by a given factor.
- **Shopping Lists:** Generate shopping lists from one or more recipes.
- **Category Configuration:** Categorize shopping list ingredients based on a custom category configuration.
- **Typescript:** Written in Typescript, providing type safety for all the data structures.

## Quick start

Install the package with your favorite package manager e.g. `npm install @tmlmt/cooklang-parser`

To get started, you can use the `Recipe` class to parse a cooklang recipe:

```typescript
import { Recipe } from "@tmlmt/cooklang-parser";

const recipeString = `
---
title: Pancakes
tags: breakfast, easy
---
Crack the @eggs{3} into a bowl, and add @coarse salt{}.

Melt the @butter{50%g} in a #pan on medium heat.

Cook for ~{15%minutes}.

Serve hot.
`;

const recipe = new Recipe(recipeString);

console.log(recipe.metadata.title); // "Pancakes"
console.log(recipe.ingredients);
console.log(recipe.cookware);
console.log(recipe.timers);
```

You can also create a shopping list from multiple recipes:

```typescript
import { ShoppingList, Recipe } from "@tmlmt/cooklang-parser";

const recipe1 = new Recipe(/* ... */);
const recipe2 = new Recipe(/* ... */);

const shoppingList = new ShoppingList();
shoppingList.add_recipe(recipe1);
shoppingList.add_recipe(recipe2);

console.log(shoppingList.ingredients);
```

And you can categorize those ingredients according to a category configuration defined in the cooklang format:

```typescript
const shoppingList = `
[Dairy]
milk
butter

[Bakery]
flour
sugar
`;

shoppingList.set_category_config(categoryConfig);
shoppingList.categorize();

console.log(shoppingList.categories);
```

## Future plans

I plan to further develop features depending on the needs I will encounter in using this library in a practical application. The main item on the todo list is to improve the documentation with detailed explanation of the extensions, as well as examples.

## Test coverage

This project includes a test setup aimed at eventually ensuring reliable parsing/scaling of as many recipe use cases as possible.

You can run the tests yourself by cloning the repository and running `pnpm test`. To see the coverage report, run `pnpm test:coverage`.

If you find any issue with your own examples of recipes, feel free to open an Issue and if you want to help fix it, to submit a Pull Request.

## License

MIT
