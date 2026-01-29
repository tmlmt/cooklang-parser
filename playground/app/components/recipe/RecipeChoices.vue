<script setup lang="ts">
import type {
  Recipe,
  RecipeChoices,
  IngredientAlternative,
  SpecificUnitSystem,
} from "cooklang-parser";
import { formatItemQuantity } from "cooklang-parser";

const props = defineProps<{
  recipe: Recipe;
}>();

const servings = defineModel<number>("servings", { required: true });
const choices = defineModel<RecipeChoices>("choices", { required: true });
const unitSystem = defineModel<SpecificUnitSystem | null>("unitSystem", {
  required: true,
});
const conversionMethod = defineModel<"keep" | "replace" | "remove">(
  "conversionMethod",
  { required: true },
);

// Unit conversion options
const unitSystems: { label: string; value: SpecificUnitSystem | null }[] = [
  { label: "None", value: null },
  { label: "Metric", value: "metric" },
  { label: "US", value: "US" },
  { label: "UK", value: "UK" },
  { label: "Japan", value: "JP" },
];
const conversionMethods: {
  label: string;
  value: "keep" | "replace" | "remove";
}[] = [
  { label: "Keep original as equivalent", value: "keep" },
  { label: "Replace original", value: "replace" },
  { label: "Remove equivalents", value: "remove" },
];

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

// --- Compute available choices ---
const hasInlineChoices = computed(
  () => props.recipe.choices.ingredientItems.size > 0,
);
const hasGroupedChoices = computed(
  () => props.recipe.choices.ingredientGroups.size > 0,
);
const hasAnyChoices = computed(
  () => hasInlineChoices.value || hasGroupedChoices.value,
);

// Convert Maps to arrays for iteration
const inlineChoicesArray = computed(() => {
  return Array.from(props.recipe.choices.ingredientItems.entries());
});
const groupedChoicesArray = computed(() => {
  return Array.from(props.recipe.choices.ingredientGroups.entries());
});

// --- Build labels and options for dropdowns ---
interface ChoiceOption {
  label: string;
  value: number | undefined;
}

function buildInlineLabel(alternatives: IngredientAlternative[]): string {
  if (alternatives.length === 0) return "Unknown";
  const first = alternatives[0]!;
  const name = first.displayName;
  if (first.itemQuantity) {
    const qty = formatItemQuantity(first.itemQuantity);
    return qty ? `${name} (${qty})` : name;
  }
  return name;
}

function buildAlternativeOptions(
  alternatives: IngredientAlternative[],
): ChoiceOption[] {
  const options: ChoiceOption[] = [{ label: "No choice", value: undefined }];
  for (let i = 0; i < alternatives.length; i++) {
    const alt = alternatives[i]!;
    let label = alt.displayName;
    if (alt.note) {
      label += ` ${alt.note}`;
    }
    if (alt.itemQuantity) {
      const qty = formatItemQuantity(alt.itemQuantity);
      if (qty) {
        label += ` (${qty})`;
      }
    }
    options.push({ label, value: i });
  }
  return options;
}

// --- Selection handlers ---
function getSelectedInline(itemId: string): number | undefined {
  return choices.value.ingredientItems?.get(itemId);
}

function setSelectedInline(itemId: string, value: number | undefined) {
  const newMap = new Map(choices.value.ingredientItems);
  if (value === undefined) {
    newMap.delete(itemId);
  } else {
    newMap.set(itemId, value);
  }
  choices.value = {
    ...choices.value,
    ingredientItems: newMap,
  };
}

function getSelectedGrouped(groupKey: string): number | undefined {
  return choices.value.ingredientGroups?.get(groupKey);
}

function setSelectedGrouped(groupKey: string, value: number | undefined) {
  const newMap = new Map(choices.value.ingredientGroups);
  if (value === undefined) {
    newMap.delete(groupKey);
  } else {
    newMap.set(groupKey, value);
  }
  choices.value = {
    ...choices.value,
    ingredientGroups: newMap,
  };
}
</script>

<template>
  <div class="flex flex-col gap-6 p-2">
    <!-- Servings Section -->
    <div class="flex flex-col gap-2">
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

    <!-- Unit Conversion Section -->
    <div class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold">Convert Units</h3>
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <label class="text-xs font-medium text-gray-700 dark:text-gray-300"
            >Target system:</label
          >
          <USelectMenu
            v-model="unitSystem"
            :items="unitSystems"
            value-key="value"
            class="w-32"
          />
        </div>
        <div v-if="unitSystem" class="flex flex-col gap-2">
          <label class="text-xs font-medium text-gray-700 dark:text-gray-300"
            >Conversion method:</label
          >
          <URadioGroup
            v-model="conversionMethod"
            :items="conversionMethods"
            value-key="value"
          />
        </div>
      </div>
    </div>

    <!-- Ingredient Choices Section -->
    <div class="flex flex-col gap-4">
      <h3 class="text-sm font-semibold">Possible Ingredient Choices</h3>

      <p v-if="!hasAnyChoices" class="text-xs text-gray-500 italic">
        No ingredient alternative available
      </p>

      <!-- Inline alternatives (single ingredient items with alternatives) -->
      <div v-if="hasInlineChoices" class="flex flex-col gap-3">
        <h4 class="text-xs font-medium text-gray-600 dark:text-gray-400">
          Inline Alternatives
        </h4>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div
            v-for="[itemId, alternatives] in inlineChoicesArray"
            :key="itemId"
            class="flex flex-col gap-1"
          >
            <label class="text-xs font-medium text-gray-700 dark:text-gray-300">
              {{ buildInlineLabel(alternatives) }}
            </label>
            <USelectMenu
              :model-value="getSelectedInline(itemId)"
              :items="buildAlternativeOptions(alternatives)"
              value-key="value"
              class="w-full"
              @update:model-value="setSelectedInline(itemId, $event)"
            />
          </div>
        </div>
      </div>

      <!-- Grouped alternatives (alternatives sharing a group key) -->
      <div v-if="hasGroupedChoices" class="flex flex-col gap-3">
        <h4 class="text-xs font-medium text-gray-600 dark:text-gray-400">
          Grouped Alternatives
        </h4>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div
            v-for="[groupKey, alternatives] in groupedChoicesArray"
            :key="groupKey"
            class="flex flex-col gap-1"
          >
            <label class="text-xs font-medium text-gray-700 dark:text-gray-300">
              {{ groupKey }}
            </label>
            <USelectMenu
              :model-value="getSelectedGrouped(groupKey)"
              :items="buildAlternativeOptions(alternatives)"
              value-key="value"
              class="w-full"
              @update:model-value="setSelectedGrouped(groupKey, $event)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
