<script setup lang="ts">
import type { Recipe } from "cooklang-parser";

const props = defineProps<{
  recipe: Recipe;
}>();

const title = computed(() => {
  return props.recipe.metadata.title || "Untitled Recipe";
});

const metadataEntries = computed(() => {
  const entries: Array<{ key: string; value: string }> = [];
  const metadata = props.recipe.metadata;

  // Iterate through metadata, excluding title (shown as heading)
  for (const [key, value] of Object.entries(metadata)) {
    if (key === "title") continue;
    if (value === undefined || value === null) continue;

    // Format arrays as comma-separated strings
    const displayValue = Array.isArray(value)
      ? value.join(", ")
      : String(value);
    entries.push({ key, value: displayValue });
  }

  return entries;
});

const hasMetadata = computed(() => metadataEntries.value.length > 0);
const hasIngredients = computed(() => props.recipe.ingredients.length > 0);
const hasCookware = computed(() => props.recipe.cookware.length > 0);
const hasSections = computed(() => props.recipe.sections.length > 0);

/**
 * Compute step numbers across all sections
 */
const sectionsWithStepNumbers = computed(() => {
  let stepCounter = 0;
  return props.recipe.sections.map((section) => {
    const contentWithNumbers = section.content.map((item) => {
      if (item.type === "step") {
        stepCounter++;
        return { ...item, stepNumber: stepCounter };
      }
      return { ...item, stepNumber: null };
    });
    return {
      name: section.name,
      content: contentWithNumbers,
    };
  });
});
</script>

<template>
  <div class="recipe-render space-y-6">
    <!-- Title -->
    <h2 class="text-2xl font-bold">{{ title }}</h2>

    <!-- Metadata Section -->
    <section v-if="hasMetadata">
      <h3 class="mb-2 text-lg font-semibold">Metadata</h3>
      <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <template v-for="entry in metadataEntries" :key="entry.key">
          <div class="font-medium text-gray-600">{{ entry.key }}</div>
          <div>{{ entry.value }}</div>
        </template>
      </div>
    </section>

    <!-- Ingredients Section -->
    <section v-if="hasIngredients">
      <h3 class="mb-2 text-lg font-semibold">Ingredients</h3>
      <ul class="list-inside list-disc space-y-1">
        <RecipeIngredientItem
          v-for="(ingredient, idx) in recipe.ingredients"
          :key="idx"
          :ingredient="ingredient"
        />
      </ul>
    </section>

    <!-- Cookware Section -->
    <section v-if="hasCookware">
      <h3 class="mb-2 text-lg font-semibold">Cookware</h3>
      <ul class="list-inside list-disc space-y-1">
        <RecipeCookwareItem
          v-for="(cw, idx) in recipe.cookware"
          :key="idx"
          :cookware="cw"
        />
      </ul>
    </section>

    <!-- Preparation Section -->
    <section v-if="hasSections">
      <h3 class="mb-2 text-lg font-semibold">Preparation</h3>
      <div class="space-y-4">
        <div
          v-for="(section, sIdx) in sectionsWithStepNumbers"
          :key="sIdx"
          class="section"
        >
          <!-- Section Name (if any) -->
          <h4
            v-if="section.name"
            class="text-md mb-2 font-semibold text-gray-700"
          >
            {{ section.name }}
          </h4>

          <!-- Steps and Notes -->
          <div class="space-y-2">
            <template v-for="(item, cIdx) in section.content" :key="cIdx">
              <!-- Step -->
              <div v-if="item.type === 'step'" class="step">
                <div class="font-bold">Step {{ item.stepNumber }}</div>
                <div class="ml-4">
                  <RecipeStepContent :step="item" :recipe="recipe" />
                </div>
              </div>

              <!-- Note -->
              <div
                v-else-if="item.type === 'note'"
                class="note ml-4 text-gray-600 italic"
              >
                Note: {{ item.note }}
              </div>
            </template>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
