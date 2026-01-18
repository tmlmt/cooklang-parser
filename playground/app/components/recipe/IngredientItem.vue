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
  isOptional?: boolean;
}>();

const optionalPrefix = computed(() => (props.isOptional ? "(optional) " : ""));

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
 * Type guard: checks if entry is a simple group with a single quantity
 */
function isSimpleGroup(
  entry: IngredientQuantityEntry,
): entry is IngredientQuantityGroup {
  return "quantity" in entry;
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
      {{ optionalPrefix }}
      <span>
        <RecipeQuantityWithEquivalents
          :quantity="displayMode.entry.quantity"
          :unit="displayMode.entry.unit"
          :equivalents="displayMode.entry.equivalents"
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
          :quantity="displayMode.entries[0].quantity"
          :unit="displayMode.entries[0].unit"
          :equivalents="displayMode.entries[0].equivalents"
        />
        and
        <RecipeQuantityWithEquivalents
          :quantity="displayMode.entries[1].quantity"
          :unit="displayMode.entries[1].unit"
          :equivalents="displayMode.entries[1].equivalents"
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
      {{ optionalPrefix }}
      <template v-if="isAndGroup(displayMode.entry)">
        <span>
          <template v-for="(qty, idx) in displayMode.entry.entries" :key="idx">
            <template v-if="idx > 0"> + </template>
            <RecipeQuantityWithEquivalents
              :quantity="qty.quantity"
              :unit="qty.unit"
              :equivalents="qty.equivalents"
            />
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
                :equivalents="eq.equivalents"
              /> </template
            >)
          </template>
        </span>
      </template>
      <!-- Handle simple group with alternatives -->
      <template v-else-if="isSimpleGroup(displayMode.entry)">
        <span>
          <RecipeQuantityWithEquivalents
            :quantity="displayMode.entry.quantity"
            :unit="displayMode.entry.unit"
            :equivalents="displayMode.entry.equivalents"
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
          <template v-if="alt.quantities?.length">
            <template v-for="(altQty, qtyIdx) in alt.quantities" :key="qtyIdx">
              <template v-if="qtyIdx > 0"> + </template>
              <RecipeQuantityWithEquivalents
                :quantity="altQty.quantity"
                :unit="altQty.unit"
                :equivalents="altQty.equivalents"
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
      {{ optionalPrefix }}
      <span>
        <template v-for="(qty, idx) in displayMode.entry.entries" :key="idx">
          <template v-if="idx > 0"> + </template>
          <RecipeQuantityWithEquivalents
            :quantity="qty.quantity"
            :unit="qty.unit"
            :equivalents="qty.equivalents"
          />
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
              :equivalents="eq.equivalents"
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
      <span class="font-bold">{{ optionalPrefix }}{{ ingredient.name }}</span
      >:
      <ul class="ml-4 list-inside list-disc">
        <li v-for="(entry, idx) in displayMode.entries" :key="idx">
          <!-- Render AND group entry -->
          <template v-if="isAndGroup(entry)">
            <span>
              <template v-for="(qty, qtyIdx) in entry.entries" :key="qtyIdx">
                <template v-if="qtyIdx > 0"> + </template>
                <RecipeQuantityWithEquivalents
                  :quantity="qty.quantity"
                  :unit="qty.unit"
                  :equivalents="qty.equivalents"
                />
              </template>
              <template v-if="entry.equivalents?.length">
                {{ " " }}(≈
                <template v-for="(eq, eqIdx) in entry.equivalents" :key="eqIdx">
                  <template v-if="eqIdx > 0">, </template>
                  <RecipeSingleQuantity
                    :quantity="eq.quantity"
                    :unit="eq.unit"
                    :equivalents="eq.equivalents"
                  /> </template
                >)
              </template>
            </span>
          </template>
          <!-- Render simple group entry -->
          <template v-else-if="isSimpleGroup(entry)">
            <span>
              <RecipeQuantityWithEquivalents
                :quantity="entry.quantity"
                :unit="entry.unit"
                :equivalents="entry.equivalents"
              />
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
                <template v-if="alt.quantities?.length">
                  <template
                    v-for="(altQty, qtyIdx) in alt.quantities"
                    :key="qtyIdx"
                  >
                    <template v-if="qtyIdx > 0"> + </template>
                    <RecipeQuantityWithEquivalents
                      :quantity="altQty.quantity"
                      :unit="altQty.unit"
                      :equivalents="altQty.equivalents"
                    />
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
      <span class="font-bold">{{ optionalPrefix }}{{ ingredient.name }}</span>
      <span
        v-if="ingredient.preparation"
        class="text-gray-500 dark:text-gray-300"
      >
        , {{ ingredient.preparation }}
      </span>
    </template>
  </li>
</template>
