<script setup lang="ts">
import type {
  Ingredient,
  QuantityWithPlainUnit,
  IngredientQuantityEntry,
  IngredientQuantityWithAlternatives,
  AlternativeIngredientRef,
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

/**
 * Get alternative info (quantity + name) for display
 */
function getAlternativesInfo(
  alts: AlternativeIngredientRef[],
): { quantity: QuantityWithPlainUnit; name: string }[] {
  return alts.map((alt) => ({
    quantity: alt.quantity,
    name: getIngredientName(alt.index),
  }));
}
</script>

<template>
  <li class="ingredient-item">
    <!-- Mode 1: Single plain quantity -->
    <template v-if="displayMode.type === 'single'">
      <span>
        <RecipeQuantityDisplay
          :quantity="displayMode.entry.quantity"
          :unit="displayMode.entry.unit"
        />
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
        <RecipeQuantityDisplay
          :quantity="displayMode.entries[0].quantity"
          :unit="displayMode.entries[0].unit"
        />
        and
        <RecipeQuantityDisplay
          :quantity="displayMode.entries[1].quantity"
          :unit="displayMode.entries[1].unit"
        />
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
        <RecipeQuantityDisplay
          :quantity="displayMode.entry.quantity"
          :unit="displayMode.entry.unit"
        />
      </span>
      {{ " " }}
      <span class="font-bold">{{ ingredient.name }}</span>
      <span v-if="ingredient.preparation" class="text-gray-500">
        , {{ ingredient.preparation }}
      </span>
      <span class="text-gray-500">
        (or
        <template
          v-for="(alt, idx) in getAlternativesInfo(
            displayMode.entry.alternatives,
          )"
          :key="idx"
        >
          <template v-if="idx > 0">, </template>
          <RecipeQuantityDisplay
            :quantity="alt.quantity.quantity"
            :unit="alt.quantity.unit"
          />
          {{ " " }}{{ alt.name }} </template
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
            <RecipeQuantityDisplay
              :quantity="entry.quantity"
              :unit="entry.unit"
            />
          </span>
          <span v-if="ingredient.preparation" class="text-gray-500">
            , {{ ingredient.preparation }}
          </span>
          <template v-if="hasAlternatives(entry)">
            <span class="text-gray-500">
              (or
              <template
                v-for="(alt, altIdx) in getAlternativesInfo(entry.alternatives)"
                :key="altIdx"
              >
                <template v-if="altIdx > 0">, </template>
                <RecipeQuantityDisplay
                  :quantity="alt.quantity.quantity"
                  :unit="alt.quantity.unit"
                />
                {{ " " }}{{ alt.name }} </template
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
