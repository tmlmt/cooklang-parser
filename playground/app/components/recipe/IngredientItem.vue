<script setup lang="ts">
import type {
  Ingredient,
  IngredientQuantityGroup,
  IngredientQuantityAndGroup,
  AlternativeIngredientRef,
} from "cooklang-parser";

type IngredientQuantityEntry =
  | IngredientQuantityGroup
  | IngredientQuantityAndGroup;

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
 * Type guard: checks if entry is an AND group (incompatible primaries with shared equivalents)
 */
function isAndGroup(
  entry: IngredientQuantityEntry,
): entry is IngredientQuantityAndGroup {
  return "type" in entry && entry.type === "and";
}

/**
 * Type guard: checks if entry is a simple group with groupQuantity
 */
function isSimpleGroup(
  entry: IngredientQuantityEntry,
): entry is IngredientQuantityGroup {
  return "groupQuantity" in entry;
}

/**
 * Checks if an entry has alternatives
 */
function hasAlternatives(
  entry: IngredientQuantityEntry,
): entry is IngredientQuantityEntry & {
  alternatives: AlternativeIngredientRef[];
} {
  return (
    "alternatives" in entry &&
    Array.isArray(entry.alternatives) &&
    entry.alternatives.length > 0
  );
}

/**
 * Determine the display mode based on quantities structure
 * Mode 1: Single simple quantity (no alternatives)
 * Mode 2: Two simple quantities (no alternatives)
 * Mode 3: Single entry with alternatives (simple or AND group)
 * Mode 4: AND group without alternatives
 * Mode 5: Complex case (multiple entries, mixed types, etc.)
 */
type DisplayMode =
  | { type: "single"; entry: IngredientQuantityGroup }
  | {
      type: "two-plain";
      entries: [IngredientQuantityGroup, IngredientQuantityGroup];
    }
  | {
      type: "single-with-alts";
      entry: IngredientQuantityEntry & {
        alternatives: AlternativeIngredientRef[];
      };
    }
  | { type: "and-group"; entry: IngredientQuantityAndGroup }
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

    if (isAndGroup(entry)) {
      return { type: "and-group", entry };
    }

    if (isSimpleGroup(entry)) {
      return { type: "single", entry };
    }
  }

  if (quantities.length === 2) {
    const [first, second] = quantities;
    if (
      isSimpleGroup(first!) &&
      isSimpleGroup(second!) &&
      !hasAlternatives(first!) &&
      !hasAlternatives(second!)
    ) {
      return { type: "two-plain", entries: [first, second] };
    }
  }

  return { type: "complex", entries: quantities };
});
</script>

<template>
  <li class="ingredient-item">
    <!-- Mode 1: Single simple quantity -->
    <template v-if="displayMode.type === 'single'">
      <span>
        <RecipeQuantityWithEquivalents
          :quantity="displayMode.entry.groupQuantity"
        />
      </span>
      {{ " " }}
      <span class="font-bold">{{ ingredient.name }}</span>
      <span
        v-if="ingredient.preparation"
        class="text-gray-500 dark:text-gray-300"
      >
        , {{ ingredient.preparation }}
      </span>
    </template>

    <!-- Mode 2: Two simple quantities -->
    <template v-else-if="displayMode.type === 'two-plain'">
      <span>
        <RecipeQuantityWithEquivalents
          :quantity="displayMode.entries[0].groupQuantity"
        />
        and
        <RecipeQuantityWithEquivalents
          :quantity="displayMode.entries[1].groupQuantity"
        />
      </span>
      {{ " " }}
      <span class="font-bold">{{ ingredient.name }}</span>
      <span
        v-if="ingredient.preparation"
        class="text-gray-500 dark:text-gray-300"
      >
        , {{ ingredient.preparation }}
      </span>
    </template>

    <!-- Mode 3: Single entry with alternatives -->
    <template v-else-if="displayMode.type === 'single-with-alts'">
      <!-- Handle AND group with alternatives -->
      <template v-if="isAndGroup(displayMode.entry)">
        <span>
          <template v-for="(qty, idx) in displayMode.entry.entries" :key="idx">
            <template v-if="idx > 0"> + </template>
            <RecipeQuantityWithEquivalents :quantity="qty" />
          </template>
          <template v-if="displayMode.entry.equivalents?.length">
            (≈
            <template
              v-for="(eq, idx) in displayMode.entry.equivalents"
              :key="idx"
            >
              <template v-if="idx > 0">, </template>
              <RecipeSingleQuantity
                :quantity="eq.quantity"
                :unit="eq.unit"
              /> </template
            >)
          </template>
        </span>
      </template>
      <!-- Handle simple group with alternatives -->
      <template v-else-if="isSimpleGroup(displayMode.entry)">
        <span>
          <RecipeQuantityWithEquivalents
            :quantity="displayMode.entry.groupQuantity"
          />
        </span>
      </template>
      {{ " " }}
      <span class="font-bold">{{ ingredient.name }}</span>
      <span
        v-if="ingredient.preparation"
        class="text-gray-500 dark:text-gray-300"
      >
        , {{ ingredient.preparation }}
      </span>
      <span class="text-gray-500 dark:text-gray-300">
        {{ " " }}(or
        <template
          v-for="(alt, idx) in displayMode.entry.alternatives"
          :key="idx"
        >
          <template v-if="idx > 0">, or </template>
          <template v-if="alt.alternativeQuantities?.length">
            <template
              v-for="(altQty, qtyIdx) in alt.alternativeQuantities"
              :key="qtyIdx"
            >
              <template v-if="qtyIdx > 0"> + </template>
              <RecipeQuantityWithEquivalents
                :quantity="altQty"
                wrapper-start="["
                wrapper-end="]"
              />
            </template>
            {{ " " }}
          </template>
          {{ getIngredientName(alt.index) }}</template
        >)
      </span>
    </template>

    <!-- Mode 4: AND group without alternatives (e.g., "2 large + 2 small carrots ≈ 5 cups") -->
    <template v-else-if="displayMode.type === 'and-group'">
      <span>
        <template v-for="(qty, idx) in displayMode.entry.entries" :key="idx">
          <template v-if="idx > 0"> + </template>
          <RecipeQuantityWithEquivalents :quantity="qty" />
        </template>
        <template v-if="displayMode.entry.equivalents?.length">
          {{ " " }}(≈
          <template
            v-for="(eq, idx) in displayMode.entry.equivalents"
            :key="idx"
          >
            <template v-if="idx > 0">, </template>
            <RecipeSingleQuantity
              :quantity="eq.quantity"
              :unit="eq.unit"
            /> </template
          >)
        </template>
      </span>
      {{ " " }}
      <span class="font-bold">{{ ingredient.name }}</span>
      <span
        v-if="ingredient.preparation"
        class="text-gray-500 dark:text-gray-300"
      >
        , {{ ingredient.preparation }}
      </span>
    </template>

    <!-- Mode 5: Complex case - bullet list -->
    <template v-else-if="displayMode.type === 'complex'">
      <span class="font-bold">{{ ingredient.name }}</span
      >:
      <ul class="ml-4 list-inside list-disc">
        <li v-for="(entry, idx) in displayMode.entries" :key="idx">
          <!-- Render AND group entry -->
          <template v-if="isAndGroup(entry)">
            <span>
              <template v-for="(qty, qtyIdx) in entry.entries" :key="qtyIdx">
                <template v-if="qtyIdx > 0"> + </template>
                <RecipeQuantityWithEquivalents :quantity="qty" />
              </template>
              <template v-if="entry.equivalents?.length">
                {{ " " }}(≈
                <template v-for="(eq, eqIdx) in entry.equivalents" :key="eqIdx">
                  <template v-if="eqIdx > 0">, </template>
                  <RecipeSingleQuantity
                    :quantity="eq.quantity"
                    :unit="eq.unit"
                  /> </template
                >)
              </template>
            </span>
          </template>
          <!-- Render simple group entry -->
          <template v-else-if="isSimpleGroup(entry)">
            <span>
              <RecipeQuantityWithEquivalents :quantity="entry.groupQuantity" />
            </span>
          </template>

          <span
            v-if="ingredient.preparation"
            class="text-gray-500 dark:text-gray-300"
          >
            , {{ ingredient.preparation }}
          </span>

          <!-- Show alternatives if present -->
          <template v-if="hasAlternatives(entry)">
            <span class="text-gray-500 dark:text-gray-300">
              {{ " " }}(or
              <template
                v-for="(alt, altIdx) in entry.alternatives"
                :key="altIdx"
              >
                <template v-if="altIdx > 0">, </template>
                <template v-if="alt.alternativeQuantities?.length">
                  <template
                    v-for="(altQty, qtyIdx) in alt.alternativeQuantities"
                    :key="qtyIdx"
                  >
                    <template v-if="qtyIdx > 0"> + </template>
                    <RecipeQuantityWithEquivalents :quantity="altQty" />
                  </template>
                  {{ " " }}
                </template>
                {{ getIngredientName(alt.index) }}</template
              >)
            </span>
          </template>
        </li>
      </ul>
    </template>

    <!-- No quantities -->
    <template v-else>
      <span class="font-bold">{{ ingredient.name }}</span>
      <span
        v-if="ingredient.preparation"
        class="text-gray-500 dark:text-gray-300"
      >
        , {{ ingredient.preparation }}
      </span>
    </template>
  </li>
</template>
