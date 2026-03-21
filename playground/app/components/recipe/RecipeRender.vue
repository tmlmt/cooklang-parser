<script setup lang="ts">
import {
  formatQuantityWithUnit,
  isSectionActive,
  isStepActive,
  type Ingredient,
  type Yield,
  type Recipe,
  type RecipeChoices,
} from "cooklang-parser";

const props = defineProps<{
  recipe: Recipe;
  choices?: RecipeChoices;
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
    if (key === "yield") {
      const yieldValue = value as Yield;
      entries.push({
        key: "yield",
        value:
          `${yieldValue.textBefore ?? ""} ${formatQuantityWithUnit(yieldValue.quantity, yieldValue.unit)} ${yieldValue.textAfter ?? ""}`.trim(),
      });
      continue;
    }
    if (key === "servings" || key === "serves") {
      entries.push({ key, value: String(value) });
      continue;
    }
    // Format arrays as comma-separated strings
    const displayValue = Array.isArray(value)
      ? value.join(", ")
      : String(value);
    entries.push({ key, value: displayValue });
  }

  return entries;
});

/**
 * Get cookware filtered by the active variant, excluding hidden cookware.
 */
const filteredCookware = computed(() => {
  return props.recipe.getCookwareForVariant({ choices: props.choices });
});

const hasMetadata = computed(() => metadataEntries.value.length > 0);
const hasCookware = computed(() => filteredCookware.value.length > 0);
const hasSections = computed(() => props.recipe.sections.length > 0);

/**
 * Get ingredients using getIngredientQuantities with choices applied.
 * This filters based on the selected alternatives and excludes hidden ingredients.
 */
const filteredIngredients = computed(() => {
  const ingredients = props.recipe.getIngredientQuantities({
    choices: props.choices,
  });
  // Exclude hidden ingredients
  return ingredients.filter(
    (ing) => !ing.flags?.includes("hidden") && ing.usedAsPrimary,
  );
});

/**
 * Check if an ingredient is optional
 */
function isOptional(ingredient: Ingredient) {
  return ingredient.flags?.includes("optional");
}

const hasIngredients = computed(() => filteredIngredients.value.length > 0);

/**
 * Compute step numbers across all sections
 */
const sectionsWithStepNumbers = computed(() => {
  let stepCounter = 0;
  const activeVariant = props.choices?.variant;
  return props.recipe.sections.map((section) => {
    const sectionIsActive = isSectionActive(section, activeVariant);
    const contentWithNumbers = section.content.map((item) => {
      if (item.type === "step") {
        const stepIsActive =
          sectionIsActive && isStepActive(item, activeVariant);
        const stepNumber = stepIsActive ? ++stepCounter : null;
        return {
          ...item,
          stepNumber,
          active: stepIsActive,
          optional: item.optional,
        };
      }
      return {
        ...item,
        stepNumber: null,
        active: sectionIsActive,
        optional: false,
      };
    });
    return {
      name: section.name,
      active: sectionIsActive,
      variants: section.variants,
      optional: section.optional,
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
      <div class="grid grid-cols-4 gap-x-4 gap-y-1 text-sm">
        <template v-for="entry in metadataEntries" :key="entry.key">
          <div class="font-medium text-gray-600 dark:text-gray-300">
            {{ entry.key }}
          </div>
          <div class="col-span-3">{{ entry.value }}</div>
        </template>
      </div>
    </section>

    <!-- Ingredients Section -->
    <section v-if="hasIngredients">
      <h3 class="mb-2 text-lg font-semibold">Ingredients</h3>
      <ul class="list-inside list-disc space-y-1">
        <RecipeIngredientItem
          v-for="(ingredient, idx) in filteredIngredients"
          :key="idx"
          :ingredient="ingredient"
          :ingredients="recipe.ingredients"
          :is-optional="isOptional(ingredient)"
        />
      </ul>
    </section>

    <!-- Cookware Section -->
    <section v-if="hasCookware">
      <h3 class="mb-2 text-lg font-semibold">Cookware</h3>
      <ul class="list-inside list-disc space-y-1">
        <RecipeCookwareItem
          v-for="(cw, idx) in filteredCookware"
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
          :class="{ 'opacity-30': !section.active }"
        >
          <!-- Section Name (if any) -->
          <h4
            v-if="section.name"
            class="text-md mb-2 font-semibold text-gray-700 dark:text-gray-200"
          >
            === {{ section.name }} ===
            <span v-if="section.optional" class="font-normal">(optional)</span>
            <span
              v-if="section.variants"
              class="text-xs font-normal text-gray-400"
            >
              [{{ section.variants.join(", ") }}]
            </span>
          </h4>

          <!-- Steps and Notes -->
          <div class="space-y-2">
            <template v-for="(item, cIdx) in section.content" :key="cIdx">
              <!-- Step -->
              <div
                v-if="item.type === 'step'"
                class="step"
                :class="{ 'opacity-30': !item.active }"
              >
                <div class="font-bold">
                  <span v-if="item.optional" class="font-normal">
                    (Optional)
                  </span>
                  <template v-if="item.active">
                    Step {{ item.stepNumber }}
                  </template>
                  <template v-else>Step (inactive)</template>
                </div>
                <div class="ml-4">
                  <RecipeStepContent
                    :step="item"
                    :recipe="recipe"
                    :choices="choices"
                  />
                </div>
              </div>

              <!-- Note -->
              <div
                v-else-if="item.type === 'note'"
                class="note ml-4 text-gray-600 italic dark:text-gray-300"
              >
                Note:
                <RecipeNoteContent :note="item" :recipe="recipe" />
              </div>
            </template>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
