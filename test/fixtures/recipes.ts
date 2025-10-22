export const simpleRecipe = `
---
title: Pancakes
tags: [breakfast, easy]
---

Crack the @eggs{3} into a #bowl{1}. Mix with some @flour{} and add @coarse salt{}.

Melt the @butter{50%g} in a #pan{} on medium heat.

Cook for ~{15%minutes}.

Serve hot.
`;

export const complexRecipe = `
---
title: Best Lasagna
source: https://www.tasteofhome.com/recipes/best-lasagna/
author: Pam Thompson
servings: 12, 12 slices
prep time: 1h
cook time: 50m
time: 1h50m
tags:
  - pasta
  - casserole
  - classic
---
= Brown the beef

Bring a large pot of salted water to a boil. Cook the @lasagne noodles{9} according to the package directions. When complete, drain the noodles, and set aside.

Meanwhile, heat a #Dutch oven{} over medium heat. Add the @bulk Italian sausage{1.2%lb}, @ground beef{3/4%lb} and diced @onion{1}(medium, diced). Cook for ~{10%minutes} or until the meat is no longer pink, breaking up the meat with a large spoon as it cooks to create gorgeous crumbles. Add the @garlic{3%cloves}, and cook for ~{1%min}, until the mixture is fragrant.

> Editor’s Tip: To ensure the noodles will not stick to each other, stir the water like a whirlpool when you add the pasta sheets.

= Make the meat sauce

Drain the mixture in the Dutch oven. Then, add the remaining sauce ingredients: @crushed tomatoes{2%cans}, @tomato paste{2%cans}, @water{2/3%cup}, @sugar{2%tbsp}, @fresh parsley{3%tbsp}(minced, divided), @dried basil{2%tsp}, @fennel seed{3/4%tsp}, @salt{1/2%tsp} and @pepper{1/4%tsp}(coarsely ground). 

Bring the mixture to a boil. Reduce the heat to a simmer. Cook, uncovered, for ~{30%min}, stirring occasionally.

= Prepare the cheese filling

In a #small bowl{}, whisk together the @egg{1}(large, lightly beaten), @ricotta cheese{1%carton}, and remaining @&fresh parsley{1/4%cup} and @&salt{1/4%tsp}. 

If you haven’t already, grate the @mozzarella{4%cups}(shredded) and @Parmesan{3/4%cup}(grated) cheeses.

> Editor’s Tip: For the freshest, creamiest taste, grate your own cheese at home.

= Layer the lasagna ingredients

Preheat the oven to 375°. 

Spoon 2 cups meat sauce into an ungreased #13×9-inch baking dish{}, spreading it out to cover the entire dish. Layer three noodles onto the sauce. Add one-third of the ricotta mixture, spreading it over the noodles with a #rubber spatula{} or an #?icing spatula{}. Sprinkle with 1 cup mozzarella cheese and 2 tablespoons Parmesan cheese.

Repeat the layers twice, finishing with remaining meat sauce and cheeses. The dish will be very full by the time you get to the top!

= Bake the lasagna

Cover the baking dish, and bake for ~{25%min}. 

Remove the cover, and cook for an additional ~{25%min}, until the sauce is bubbling around the edges and the cheese is fully melted. 

Let the lasagna stand for ~{15%min} before slicing and serving.
`;

export const recipeWithComplexServings = `
---
servings: 2, a few
---
Pour @water{1%L}
`;

export const recipeToScale = `
---
servings: 2
yield: 2
serves: 2
---

Mix @flour{50%g} with some more @&flour{50%g}, @sugar{1/2%tsp}, @eggs{2-3} and @milk
`;

export const recipeToScaleSomeFixedQuantities = `
---
servings: 1
---

Mix @flour{50%g} with the fixed magic quantity of @butter{=10%g}`;

export const recipeForShoppingList1 = `
---
servings: 1
---
Mix @flour{100%g}, @sugar{50%g}, @eggs{2}, @milk{200%ml}

Season with @pepper{to taste}, @-salt and @spices
`;

export const recipeForShoppingList2 = `
---
servings: 1
---
Mix @flour{50%g}, @butter{25%g} and @eggs{1}

Add @pepper{1%tsp} and @spices{1%pinch}
`;
