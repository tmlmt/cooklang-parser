<script setup lang="ts">
import type { Recipe, Step, Item, Timer } from "cooklang-parser";

const props = defineProps<{
  step: Step;
  recipe: Recipe;
}>();

/**
 * Get the display name for an ingredient item
 */
function getIngredientDisplayName(item: Item & { type: "ingredient" }): string {
  // Use the first alternative's display name
  if (item.alternatives.length > 0 && item.alternatives[0]) {
    return item.alternatives[0].displayName;
  }
  return "";
}

/**
 * Get the cookware by index
 */
function getCookware(index: number) {
  return props.recipe.cookware[index];
}

/**
 * Get the timer by index
 */
function getTimer(index: number): Timer | undefined {
  return props.recipe.timers[index];
}
</script>

<template>
  <span class="step-content">
    <template v-for="(item, idx) in step.items" :key="idx">
      <template v-if="item.type === 'text'">{{ item.value }}</template>
      <template v-else-if="item.type === 'ingredient'">
        <span class="font-medium text-green-600">{{
          getIngredientDisplayName(item)
        }}</span>
      </template>
      <template v-else-if="item.type === 'cookware'">
        <span class="font-medium text-blue-600">{{
          getCookware(item.index)?.name
        }}</span>
      </template>
      <template v-else-if="item.type === 'timer'">
        <RecipeTimerItem
          v-if="getTimer(item.index)"
          :timer="getTimer(item.index)!"
        />
      </template>
    </template>
  </span>
</template>
