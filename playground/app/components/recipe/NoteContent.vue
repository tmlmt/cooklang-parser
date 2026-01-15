<script setup lang="ts">
import type { Recipe, Note, ArbitraryScalable } from "cooklang-parser";

const props = defineProps<{
  note: Note;
  recipe: Recipe;
}>();

/**
 * Get the arbitrary scalable by index
 */
function getArbitrary(index: number): ArbitraryScalable | undefined {
  return props.recipe.arbitraries[index];
}
</script>

<template>
  <span class="note-content">
    <template v-for="(item, idx) in note.items" :key="idx">
      <template v-if="item.type === 'text'">{{ item.value }}</template>
      <template v-else-if="item.type === 'arbitrary'">
        <span
          v-if="getArbitrary(item.index)"
          class="font-medium text-purple-600 not-italic dark:text-purple-400"
        >
          <RecipeSingleQuantity
            :quantity="getArbitrary(item.index)!.quantity"
            :unit="getArbitrary(item.index)!.unit"
          />
          <template v-if="getArbitrary(item.index)!.name">
            {{ " " }}{{ getArbitrary(item.index)!.name }}
          </template>
        </span>
      </template>
    </template>
  </span>
</template>
