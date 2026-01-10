# Cooklang Parser

A typescript library to parse and manipulate [cooklang](https://cooklang.org/) recipes.

<picture><img src="https://badges.ws/maintenance/yes/2026" /></picture>
<picture><img src="https://badges.ws/npm/dt/@tmlmt/cooklang-parser" /></picture>
<picture><img src="https://badges.ws/npm/l/@tmlmt/cooklang-parser" /></picture>
<picture><img src="https://badges.ws/github/release/tmlmt/cooklang-parser" /></picture>
[<img src="https://badges.ws/badge/documentation-5672CD?icon=vitepress" />](https://cooklang-parser.tmlmt.com)

## Introduction

This library provides a set of tools to work with recipes written in the Cooklang format. It allows you to parse recipes, extract ingredients, cookware, and timers, scale recipes, and generate shopping lists.

## Features

- **Cooklang Compliant:** Fully compliant with the Cooklang specifications.
- **Recipe Parsing:** Parse Cooklang recipes to extract metadata, ingredients, cookware, timers, and steps.
  Several extensions on top of the original cooklang specifications
  and [detailed in the docs](https://cooklang-parser.tmlmt.com/guide-extensions).
- **Recipe Scaling:** Scale recipes by a given factor.
- **Shopping Lists:** Generate shopping lists from one or more recipes.
- **Category Configuration:** Categorize shopping list ingredients based on a custom category configuration.
- **Typescript:** Written in Typescript, providing type safety for all the data structures.

## Quick start

- Install the package with your favorite package manager, e.g.:

`npm install @tmlmt/cooklang-parser`

- Use the `Recipe` class to parse a cooklang recipe:

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
console.log(recipe.ingredients); // [{ name: "eggs", ...}, ...]
console.log(recipe.cookware); // [{ name: "pan", ...}]
console.log(recipe.timers); // [{ duration: 15, unit: "minutes", name: undefined}]
```

- Browse the [API Reference](https://cooklang-parser.tmlmt.com/api/classes/Recipe) to discover all functionalities

## Future plans

I plan to further develop features depending on the needs or bugs I will encounter in using this library in a practical application. The current backlog and status can be seen in the [Issues](https://github.com/tmlmt/cooklang-parser/issues) page.

## Test coverage

This project includes a test setup aimed at eventually ensuring reliable parsing/scaling of as many recipe use cases as possible.

You can run the tests yourself by cloning the repository and running `pnpm test`. To see the coverage report, run `pnpm test:coverage`.

## Contributing

If you find any issue with your own examples of recipes, feel free to open an Issue and if you want to help fix it, to submit a Pull Request (PR). Please follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) spec when submitting PRs.
