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
title: Simple Pancakes
servings: 4
tags: [breakfast, easy]
prep time: 10 minutes
cook time: 15 minutes
---

Mix @eggs{2} with @milk{200%mL} and @flour{150%g} in a #bowl.

Melt some @butter{20%g} in a #pan{} on medium heat.

Pour batter and cook for ~{2-3%minutes} on each side until golden.

[- Serve with maple syrup or fresh berries -]

== Toppings ==

Add @maple syrup{} or @fresh berries{1%cup} on top.
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
        <UButton class="my-1 w-full" color="primary">Editor</UButton>
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
          :ui="{ content: 'h-[calc(100vh-9.5rem)] overflow-auto' }"
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
          :ui="{ content: 'h-[calc(100vh-9.5rem)] overflow-auto' }"
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
