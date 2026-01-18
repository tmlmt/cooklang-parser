<script setup lang="ts">
import type { Recipe } from "cooklang-parser";

const props = defineProps<{
  recipe: Recipe;
}>();

const servings = defineModel<number>("servings", { required: true });

// Reset servings when recipe's base servings change
watch(
  () => props.recipe.servings,
  (newServings) => {
    if (newServings !== undefined) {
      servings.value = newServings;
    }
  },
);

// Compute the step based on original servings:
// - If integer: step = 1
// - If < 1: step = servings itself
// - If > 1 and not integer: divide by smallest integer n until result < 1
const step = computed(() => {
  const baseServings = props.recipe.servings;
  if (!baseServings) return 1;

  // Check if it's an integer
  if (Number.isInteger(baseServings)) {
    return 1;
  }

  // If < 1, step is itself
  if (baseServings < 1) {
    return baseServings;
  }

  // If > 1 and not integer, divide by increasing integers until result < 1
  let n = 2;
  while (baseServings / n >= 1) {
    n++;
  }
  return baseServings / n;
});
</script>

<template>
  <div class="flex flex-col gap-4 p-2">
    <div class="flex items-center gap-3">
      <label class="text-sm font-medium">Servings:</label>
      <UInputNumber
        v-model="servings"
        :min="step"
        :max="100"
        :step="step"
        class="w-24"
      />
    </div>
    <p v-if="recipe.servings" class="text-xs text-gray-500">
      Original recipe: {{ recipe.servings }} servings
    </p>
  </div>
</template>
