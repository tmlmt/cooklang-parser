<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import { Recipe } from "cooklang-parser";

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

const rawRecipe = ref<string>(`Mix @eggs{2} with @milk{200%mL}`);

const parsedRecipe = computed(() => {
  const recipe = new Recipe(rawRecipe.value);
  return recipe;
});
</script>

<template>
  <div class="h-screen w-full p-4">
    <h1 class="mb-4 text-3xl font-bold">@tmlmt/cooklang-parser Playground</h1>
    <div class="mb-4 grid grid-cols-1 items-start gap-4 md:grid-cols-2">
      <!-- Desktop: Editor on the left half -->
      <div class="hidden h-[calc(100vh-8rem)] md:block">
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
          :ui="{ content: 'h-[calc(100vh-8rem)] overflow-auto' }"
        >
          <template #raw>
            <div class="w-full">
              <pre class="text-xs">{{ parsedRecipe }}</pre>
            </div>
          </template>

          <template #render>
            <div class="w-full text-sm">Rendered output goes here.</div>
          </template>
        </UTabs>
      </div>

      <!-- Mobile: 3 tabs including Editor -->
      <div class="md:hidden">
        <UTabs :items="mobileItems">
          <template #editor>
            <UTextarea v-model="rawRecipe" class="h-full w-full text-sm" />
          </template>

          <template #raw>
            <div class="w-full">
              <pre class="text-xs">{{ parsedRecipe }}</pre>
            </div>
          </template>

          <template #render>
            <div class="w-full text-sm">Rendered output goes here.</div>
          </template>
        </UTabs>
      </div>
    </div>
  </div>
</template>
