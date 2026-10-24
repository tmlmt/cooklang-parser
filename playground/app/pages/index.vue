<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import { DiagnosticError, ParseStoppedError, Recipe } from "cooklang-parser";
import type {
  RecipeChoices,
  SpecificUnitSystem,
  Diagnostic,
} from "cooklang-parser";
import pkg from "~~/../package.json";

const version = pkg.version;
const fullVersion = `v${version}`;

// Mobile: 4 tabs including Editor
const mobileItems = ref<TabsItem[]>([
  { label: "Editor", slot: "editor" },
  { label: "Render", slot: "render" },
  { label: "Choices", slot: "choices" },
  { label: "Diagnostics", slot: "diagnostics" },
  { label: "Raw", slot: "raw" },
]);

// Desktop: 2 tabs left and 2 tabs right
const desktopItemsLeft = ref<TabsItem[]>([
  { label: "Editor", slot: "editor" },
  { label: "Choices", slot: "choices" },
]);
const desktopItemsRight = ref<TabsItem[]>([
  { label: "Render", slot: "render" },
  { label: "Diagnostics", slot: "diagnostics" },
  { label: "Raw", slot: "raw" },
]);

const rawRecipe = ref<string>(`---
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
`);

const diagnostics = ref<Diagnostic[]>([]);
const parseStopped = ref(false);
const hasErrors = ref(false);
const hasWarnings = ref(false);
const activeDesktopRightTab = ref("render");
const parsedRecipe = ref<Recipe | undefined>();

// Step 1: Parse the raw recipe text
watch(
  rawRecipe,
  () => {
    try {
      diagnostics.value = [];
      parseStopped.value = false;
      hasErrors.value = false;
      hasWarnings.value = false;
      const recipe = new Recipe(rawRecipe.value);
      if (recipe.diagnostics.some((d) => d.severity === "error")) {
        hasErrors.value = true;
      }
      if (recipe.diagnostics.length) {
        hasWarnings.value = true;
      }
      diagnostics.value = recipe.diagnostics;
      parsedRecipe.value = recipe;
    } catch (error) {
      if (error instanceof DiagnosticError) {
        hasErrors.value = true;
        diagnostics.value = error.diagnostics;
      }
      if (error instanceof ParseStoppedError) {
        parseStopped.value = true;
        parsedRecipe.value = undefined;
      }
    }
  },
  { immediate: true },
);

// Servings state for scaling
const servings = ref<number>(1);

// Choices state for ingredient alternatives
const choices = ref<RecipeChoices>({
  ingredientItems: new Map(),
  ingredientGroups: new Map(),
});

// Unit conversion state
const unitSystem = ref<SpecificUnitSystem | null>(null);
const conversionMethod = ref<"keep" | "replace" | "remove">("keep");

// Step 2: Apply unit conversion (if selected)
const convertedRecipe = computed(() => {
  if (unitSystem.value === null) {
    return parsedRecipe.value;
  }
  if (parsedRecipe.value)
    return parsedRecipe.value.convertTo(
      unitSystem.value,
      conversionMethod.value,
    );
  return null;
});

// Step 3: Apply scaling (if different from base servings)
const scaledRecipe = computed(() => {
  if (!convertedRecipe.value) {
    return null;
  }
  const baseServings = convertedRecipe.value.servings;
  if (baseServings && servings.value !== baseServings) {
    return convertedRecipe.value.scaleTo(servings.value);
  }
  return convertedRecipe.value;
});

// Initialize and reset servings when recipe servings change
watch(
  () => (parsedRecipe.value ? parsedRecipe.value.servings : undefined),
  (newServings) => {
    if (newServings !== undefined) {
      servings.value = newServings;
    }
  },
  { immediate: true },
);

// Reset choices and conversion when parsed recipe changes
watch(
  () => parsedRecipe.value,
  () => {
    choices.value = {
      ingredientItems: new Map(),
      ingredientGroups: new Map(),
    };
    unitSystem.value = null;
  },
);
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
            <UAlert
              v-if="rawRecipe.trim().length === 0"
              color="neutral"
              variant="subtle"
              description="No recipe parsed yet."
            />
            <RecipeChoices
              v-else-if="parsedRecipe"
              v-model:servings="servings"
              v-model:choices="choices"
              v-model:unit-system="unitSystem"
              v-model:conversion-method="conversionMethod"
              :recipe="parsedRecipe"
            />
          </template>
        </UTabs>
      </div>
      <!-- Desktop: 2 tabs on the right half -->
      <div class="hidden md:block">
        <UTabs
          v-model="activeDesktopRightTab"
          value-key="slot"
          :items="desktopItemsRight"
          :ui="{
            label: 'dark:text-gray-300 dark:hover:text-white',
            content: 'h-[calc(100vh-9.5rem)]',
          }"
        >
          <template #render>
            <UAlert
              v-if="rawRecipe.trim().length === 0"
              color="neutral"
              variant="subtle"
              description="No recipe parsed yet."
            />
            <UCard
              v-else
              class="h-full w-full text-sm"
              :ui="{
                root: 'flex h-full flex-col',
                body: 'flex-1 overflow-auto',
                footer: 'shrink-0',
              }"
            >
              <UAlert
                v-if="parseStopped"
                color="error"
                variant="subtle"
                title="Invalid recipe"
                description="A fatal error was encountered while parsing the recipe."
              />
              <RecipeRender
                v-else-if="scaledRecipe"
                :recipe="scaledRecipe"
                :choices="choices"
              />
              <template #footer>
                <div v-if="parseStopped" class="text-red-700 dark:text-red-400">
                  ✕ Fatal error
                </div>
                <div
                  v-else-if="hasErrors"
                  class="text-red-700 dark:text-red-400"
                >
                  ✕ Errors:
                  <UButton
                    variant="link"
                    color="error"
                    class="pl-0 text-red-700 dark:text-red-400"
                    @click="activeDesktopRightTab = 'diagnostics'"
                    >click to see them</UButton
                  >
                </div>
                <div
                  v-else-if="hasWarnings"
                  class="text-orange-400 dark:text-orange-300"
                >
                  ⚠ Warnings:
                  <UButton
                    variant="link"
                    color="warning"
                    class="pl-0 text-orange-400 dark:text-orange-300"
                    @click="activeDesktopRightTab = 'diagnostics'"
                    >click to see them</UButton
                  >
                </div>
                <div v-else class="text-green-600">✓ No issues</div>
              </template>
            </UCard>
          </template>

          <template #diagnostics>
            <UCard
              class="h-full w-full"
              :ui="{
                root: 'flex h-full flex-col',
                body: 'flex-1 overflow-auto',
              }"
            >
              <div v-if="diagnostics.length">
                <DiagnosticCard
                  v-for="(diagnostic, index) in diagnostics.sort((a, b) =>
                    a.severity.localeCompare(b.severity),
                  )"
                  :key="index"
                  :diagnostic="diagnostic"
                  :raw-recipe="rawRecipe"
                />
              </div>
              <UAlert
                v-else
                color="success"
                variant="subtle"
                description="Recipe parsed without any issue"
              />
            </UCard>
          </template>

          <template #raw>
            <UCard
              class="h-full w-full"
              :ui="{
                root: 'flex h-full flex-col',
                body: 'flex-1 overflow-auto',
              }"
            >
              <pre class="text-xs">{{ scaledRecipe }}</pre>
            </UCard>
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

          <template #diagnostics>
            <div class="w-full" />
          </template>

          <template #raw>
            <div class="w-full">
              <pre class="text-xs">{{ scaledRecipe }}</pre>
            </div>
          </template>

          <template #choices>
            <RecipeChoices
              v-if="parsedRecipe"
              v-model:servings="servings"
              v-model:choices="choices"
              v-model:unit-system="unitSystem"
              v-model:conversion-method="conversionMethod"
              :recipe="parsedRecipe"
            />
            <UAlert v-else color="neutral" variant="subtle">
              No recipe parsed yet.
            </UAlert>
          </template>

          <template #render>
            <div class="w-full text-sm">
              <RecipeRender
                v-if="scaledRecipe"
                :recipe="scaledRecipe"
                :choices="choices"
              />
              <UAlert
                v-else
                color="neutral"
                variant="subtle"
                title="Invalid recipe"
              >
                No recipe parsed yet.
              </UAlert>
            </div>
          </template>
        </UTabs>
      </div>
    </div>
  </div>
</template>
