<script setup lang="ts">
import type {
  Ingredient,
  QuantityWithPlainUnit,
  IngredientQuantityEntry,
  IngredientQuantityWithAlternatives,
} from "cooklang-parser";

const props = defineProps<{
  ingredient: Ingredient;
  ingredients: Ingredient[];
}>();

/**
 * Get ingredient name by index
 */
function getIngredientName(index: number): string {
  return props.ingredients[index]?.name ?? "unknown";
}

/**
 * Checks if an entry has alternatives
 */
function hasAlternatives(
  entry: IngredientQuantityEntry,
): entry is IngredientQuantityWithAlternatives {
  return "alternatives" in entry && Array.isArray(entry.alternatives);
}

/**
 * Determine the display mode based on quantities structure
 * Mode 1: Single plain quantity
 * Mode 2: Two plain quantities (no alternatives)
 * Mode 3: Single quantity with alternatives
 * Mode 4: Complex case (multiple entries, some with alternatives, etc.)
 */
type DisplayMode =
  | { type: "single"; entry: QuantityWithPlainUnit }
  | {
      type: "two-plain";
      entries: [QuantityWithPlainUnit, QuantityWithPlainUnit];
    }
  | { type: "single-with-alts"; entry: IngredientQuantityWithAlternatives }
  | { type: "complex"; entries: IngredientQuantityEntry[] }
  | { type: "none" };

const displayMode = computed<DisplayMode>(() => {
  const quantities = props.ingredient.quantities;
  if (!quantities || quantities.length === 0) {
    return { type: "none" };
  }

  if (quantities.length === 1) {
    const entry = quantities[0]!;
    if (hasAlternatives(entry)) {
      return { type: "single-with-alts", entry };
    }
    return { type: "single", entry };
  }

  if (quantities.length === 2) {
    const [first, second] = quantities as [
      IngredientQuantityEntry,
      IngredientQuantityEntry,
    ];
    if (!hasAlternatives(first) && !hasAlternatives(second)) {
      return { type: "two-plain", entries: [first, second] };
    }
  }

  return { type: "complex", entries: quantities };
});
</script>

<template>
  <li class="ingredient-item">
    <!-- Mode 1: Single plain quantity -->
    <template v-if="displayMode.type === 'single'">
      <span>
        <RecipeQuantityWithEquivalents :quantity="displayMode.entry" />
      </span>
      {{ " " }}
      <span class="font-bold">{{ ingredient.name }}</span>
      <span v-if="ingredient.preparation" class="text-gray-500">
        , {{ ingredient.preparation }}
      </span>
    </template>

    <!-- Mode 2: Two plain quantities -->
    <template v-else-if="displayMode.type === 'two-plain'">
      <span>
        <RecipeQuantityWithEquivalents :quantity="displayMode.entries[0]" />
        and
        <RecipeQuantityWithEquivalents :quantity="displayMode.entries[1]" />
      </span>
      {{ " " }}
      <span class="font-bold">{{ ingredient.name }}</span>
      <span v-if="ingredient.preparation" class="text-gray-500">
        , {{ ingredient.preparation }}
      </span>
    </template>

    <!-- Mode 3: Single quantity with alternatives -->
    <template v-else-if="displayMode.type === 'single-with-alts'">
      <span>
        <RecipeQuantityWithEquivalents :quantity="displayMode.entry" />
      </span>
      {{ " " }}
      <span class="font-bold">{{ ingredient.name }}</span>
      <span v-if="ingredient.preparation" class="text-gray-500">
        , {{ ingredient.preparation }}
      </span>
      <span class="text-gray-500">
        (or
        <template
          v-for="(alt, idx) in displayMode.entry.alternatives"
          :key="idx"
        >
          <template v-if="idx > 0">, </template>
          <RecipeQuantityWithEquivalents
            v-if="alt.alternativeQuantity"
            :quantity="alt.alternativeQuantity"
            wrapper-start="["
            wrapper-end="]"
          />
          {{ " " }}{{ getIngredientName(alt.index) }} </template
        >)
      </span>
    </template>

    <!-- Mode 4: Complex case - bullet list -->
    <template v-else-if="displayMode.type === 'complex'">
      <span class="font-bold">{{ ingredient.name }}</span
      >:
      <ul class="ml-4 list-inside list-disc">
        <li v-for="(entry, idx) in displayMode.entries" :key="idx">
          <span>
            <RecipeQuantityWithEquivalents :quantity="entry" />
          </span>
          <span v-if="ingredient.preparation" class="text-gray-500">
            , {{ ingredient.preparation }}
          </span>
          <template v-if="hasAlternatives(entry)">
            <span class="text-gray-500">
              (or
              <template
                v-for="(alt, altIdx) in entry.alternatives"
                :key="altIdx"
              >
                <template v-if="altIdx > 0">, </template>
                <RecipeQuantityWithEquivalents
                  v-if="alt.alternativeQuantity"
                  :quantity="alt.alternativeQuantity"
                />
                {{ " " }}{{ getIngredientName(alt.index) }} </template
              >)
            </span>
          </template>
        </li>
      </ul>
    </template>

    <!-- No quantities -->
    <template v-else>
      <span class="font-bold">{{ ingredient.name }}</span>
      <span v-if="ingredient.preparation" class="text-gray-500">
        , {{ ingredient.preparation }}
      </span>
    </template>
  </li>
</template>
