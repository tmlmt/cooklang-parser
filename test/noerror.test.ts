import { describe, it, expect } from "vitest";
import { Recipe } from "../src/index";

describe("noerror", () => {
  it("should not throw an error when manipulating complex recipes", () => {
    const recipe_raw = `---
title: Vegan-Friendly Banana Bread
servings: 8
yield: 1%loaf
description: >
  A moist and delicious banana bread that's perfect for breakfast or a snack. This recipe is vegan-friendly, 
  using flax eggs and coconut oil instead of traditional ingredients, without compromising on flavor 
  or texture.
tags: [baking, lactose-free-option]
variants: [lactose-free]
---

> This recipe has an energy content of {{250%kcal}}

Preheat oven to ~{10%minutes}.

Mash @ripe bananas{1%=large|1.5%cup} and @&ripe bananas{2%=small|1%cup} in a #large bowl{}.

Add @butter{115%g|4%oz}|coconut oil{100%g}[lactose-free] and mix well.

Whisk in @|eggs|eggs{2%large} that you can also replace by @|eggs/alt|flax eggs{2} and @|eggs/alt|salt{1%pinch}.

[*] In a #separate bowl{}, combine @flour{280%g|2%cups}, @sugar{150%g}|cane sugar{150%g}, and @-salt{1/4%tsp}.

[minimal-equipment] Wash the bowl for reuse. In it, combine @flour{280%g|2%cups}, @sugar{150%g}|cane sugar{150%g}, and @-salt{1/4%tsp}.

Fold dry ingredients into wet mixture.

[?] Wait for ~{10%min}

== [?] Toppings ==

Add @walnuts{100%g}(chopped) or @?chocolate chips{150%g}.

== Baking ==

Grease a #loaf pan{} with @&butter{15%g}|&coconut oil{15%g}[lactose-free] and pour in batter.

Beat @&eggs{2%small} for the glaze and brush on top.

Bake for ~{55-60%min} until golden.

> This recipe was written using [cooklang](https://cooklang.org) syntax and additional extensions.
`;

    expect(() => new Recipe(recipe_raw)).not.toThrow();
    const recipe = new Recipe(recipe_raw);
    expect(() => recipe.scaleBy(2)).not.toThrow();
  });
});
