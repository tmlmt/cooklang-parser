<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import { Recipe } from "cooklang-parser";
import pkg from "~~/../package.json";

const version = pkg.version;
const fullVersion = `v${version}`;

// Mobile: 3 tabs including Editor
const mobileItems = ref<TabsItem[]>([
  { label: "Editor", slot: "editor" },
  { label: "Raw", slot: "raw" },
  { label: "Render", slot: "render" },
]);

// Desktop: 2 tabs (Editor is separate on the left)
const desktopItems = ref<TabsItem[]>([
  { label: "Raw", slot: "raw" },
  { label: "Render", slot: "render" },
]);

const rawRecipe = ref<string>(`---
title: Vegan-Friendly Banana Bread
servings: 8
tags: [baking, vegan-option]
---

Preheat oven to ~{10%minutes}.

Mash @ripe bananas{1%=large|1.5%cup} and @&ripe bananas{2%=small|1%cup} in a #large bowl{}.

Add @butter{115%g|4%oz}|coconut oil{100%g}[vegan] and mix well.

Whisk in @eggs{2%large}|flax eggs{2}[vegan].

In a #separate bowl{}, combine @flour{280%g|2%cups}, @sugar{150%g}, and @-salt{1/4%tsp}.

Fold dry ingredients into wet mixture.

Add @?walnuts{100%g}(chopped) or @?chocolate chips{150%g}.

Grease a #loaf pan{} with @&butter{15%g} and pour in batter.

Beat @&eggs{2%small} for the glaze and brush on top.

Bake for ~{55-60%minutes} until golden.

`);

const parsedRecipe = computed(() => {
  const recipe = new Recipe(rawRecipe.value);
  return recipe;
});
</script>

<template>
  <div class="h-screen w-full p-4">
    <div class="mb-2 flex justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-bold md:text-3xl">
          <b>@tmlmt/cooklang-parser</b>
        </h1>
        <div class="text-lg font-semibold">Playground</div>
      </div>
      <div class="flex flex-col items-end justify-around gap-1">
        <UColorModeButton />
        <div class="mb-1 text-xs md:text-sm">{{ fullVersion }}</div>
      </div>
    </div>

    <div class="mb-4 grid grid-cols-1 items-start gap-4 md:grid-cols-2">
      <!-- Desktop: Editor on the left half -->
      <div class="hidden h-[calc(100vh-9rem)] md:block">
        <UButton
          class="my-1 w-full dark:text-gray-300 dark:hover:text-white"
          color="primary"
          >Editor</UButton
        >
        <UTextarea
          v-model="rawRecipe"
          class="h-full w-full text-sm"
          :ui="{ base: 'h-full' }"
        />
      </div>
      <!-- Desktop: 2 tabs on the right half -->
      <div class="hidden md:block">
        <UTabs
          :items="desktopItems"
          :ui="{
            label: 'dark:text-gray-300 dark:hover:text-white',
            content: 'h-[calc(100vh-9.5rem)] overflow-auto',
          }"
        >
          <template #raw>
            <div class="w-full">
              <pre class="text-xs">{{ parsedRecipe }}</pre>
            </div>
          </template>

          <template #render>
            <div class="w-full text-sm">
              <RecipeRender :recipe="parsedRecipe" />
            </div>
          </template>
        </UTabs>
      </div>

      <!-- Mobile: 3 tabs including Editor -->
      <div class="md:hidden">
        <UTabs
          :items="mobileItems"
          :ui="{
            label: 'dark:text-gray-300 dark:hover:text-white',
            content: 'h-[calc(100vh-9.5rem)] overflow-auto',
          }"
        >
          <template #editor>
            <UTextarea
              v-model="rawRecipe"
              class="h-full w-full text-sm"
              :ui="{ base: 'h-full' }"
            />
          </template>

          <template #raw>
            <div class="w-full">
              <pre class="text-xs">{{ parsedRecipe }}</pre>
            </div>
          </template>

          <template #render>
            <div class="w-full text-sm">
              <RecipeRender :recipe="parsedRecipe" />
            </div>
          </template>
        </UTabs>
      </div>
    </div>
  </div>
</template>
