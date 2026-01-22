<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import type { RecipeChoices } from "cooklang-parser";
import { Recipe } from "cooklang-parser";
import pkg from "~~/../package.json";

const version = pkg.version;
const fullVersion = `v${version}`;

// Mobile: 4 tabs including Editor
const mobileItems = ref<TabsItem[]>([
  { label: "Editor", slot: "editor" },
  { label: "Render", slot: "render" },
  { label: "Choices", slot: "choices" },
  { label: "Raw", slot: "raw" },
]);

// Desktop: 2 tabs left and 2 tabs right
const desktopItemsLeft = ref<TabsItem[]>([
  { label: "Editor", slot: "editor" },
  { label: "Choices", slot: "choices" },
]);
const desktopItemsRight = ref<TabsItem[]>([
  { label: "Render", slot: "render" },
  { label: "Raw", slot: "raw" },
]);

const rawRecipe = ref<string>(`---
title: Vegan-Friendly Banana Bread
servings: 8
tags: [baking, vegan-option]
---

> This recipe has an energy content of {{250%kcal}}

Preheat oven to ~{10%minutes}.

Mash @ripe bananas{1%=large|1.5%cup} and @&ripe bananas{2%=small|1%cup} in a #large bowl{}.

Add @butter{115%g|4%oz}|coconut oil{100%g}[vegan] and mix well.

Whisk in @|eggs|eggs{2%large} that you can also replace by @|eggs|flax eggs{2}.

In a #separate bowl{}, combine @flour{280%g|2%cups}, @sugar{150%g}|cane sugar{150%g}, and @-salt{1/4%tsp}.

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

// Servings state for scaling - initialize from parsed recipe
const servings = ref<number>(1);

// Choices state for ingredient alternatives
const choices = ref<RecipeChoices>({
  ingredientItems: new Map(),
  ingredientGroups: new Map(),
});

// Initialize and reset servings when recipe servings change
watch(
  () => parsedRecipe.value.servings,
  (newServings) => {
    if (newServings !== undefined) {
      servings.value = newServings;
    }
  },
  { immediate: true },
);

// Reset choices when parsed recipe changes
watch(
  () => parsedRecipe.value,
  () => {
    choices.value = {
      ingredientItems: new Map(),
      ingredientGroups: new Map(),
    };
  },
);

// Scaled recipe based on servings selection
const scaledRecipe = computed(() => {
  if (
    parsedRecipe.value.servings &&
    servings.value !== parsedRecipe.value.servings
  ) {
    return parsedRecipe.value.scaleTo(servings.value);
  }
  return parsedRecipe.value;
});
</script>

<template>
  <div class="h-screen w-full p-4">
    <div class="mb-2 flex justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-xl font-bold md:text-3xl">
          <b>@tmlmt/cooklang-parser</b>
        </h1>
        <div class="text-lg font-semibold">Playground</div>
      </div>
      <div class="flex flex-col items-end justify-around gap-1">
        <div class="flex items-center">
          <UButton
            to="https://github.com/tmlmt/cooklang-parser"
            target="_blank"
            class="hover:bg-elevated active:bg-accented h-8 w-6 bg-transparent md:w-7 dark:bg-neutral-900"
            ><UIcon
              name="mdi:github"
              class="dark:focus:bg-royal-800 size-5 shrink-0 bg-gray-700 dark:bg-white"
          /></UButton>
          <UButton
            to="https://cooklang-parser.tmlmt.com/v3"
            target="_blank"
            class="hover:bg-elevated active:bg-accented h-8 w-7 bg-transparent md:w-8 dark:bg-neutral-900"
            ><UIcon
              name="material-symbols:docs"
              class="size-5 shrink-0 bg-gray-700 dark:bg-white"
          /></UButton>
          <UColorModeButton />
        </div>
        <div class="mb-1 text-xs md:text-sm">{{ fullVersion }}</div>
      </div>
    </div>

    <div class="mb-4 grid grid-cols-1 items-start gap-4 md:grid-cols-2">
      <!-- Desktop: Editor on the left half -->
      <div class="hidden h-[calc(100vh-9rem)] md:block">
        <UTabs
          :items="desktopItemsLeft"
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

          <template #choices>
            <RecipeChoices
              v-model:servings="servings"
              v-model:choices="choices"
              :recipe="parsedRecipe"
            />
          </template>
        </UTabs>
      </div>
      <!-- Desktop: 2 tabs on the right half -->
      <div class="hidden md:block">
        <UTabs
          :items="desktopItemsRight"
          :ui="{
            label: 'dark:text-gray-300 dark:hover:text-white',
            content: 'h-[calc(100vh-9.5rem)] overflow-auto',
          }"
        >
          <template #render>
            <div class="w-full text-sm">
              <RecipeRender :recipe="scaledRecipe" :choices="choices" />
            </div>
          </template>

          <template #raw>
            <div class="w-full">
              <pre class="text-xs">{{ scaledRecipe }}</pre>
            </div>
          </template>
        </UTabs>
      </div>

      <!-- Mobile: 4 tabs including Editor -->
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
              <pre class="text-xs">{{ scaledRecipe }}</pre>
            </div>
          </template>

          <template #choices>
            <RecipeChoices
              v-model:servings="servings"
              v-model:choices="choices"
              :recipe="parsedRecipe"
            />
          </template>

          <template #render>
            <div class="w-full text-sm">
              <RecipeRender :recipe="scaledRecipe" :choices="choices" />
            </div>
          </template>
        </UTabs>
      </div>
    </div>
  </div>
</template>
