<script setup lang="ts">
import type {
  Recipe,
  Step,
  StepItem,
  Timer,
  IngredientAlternative,
  IngredientItemQuantity,
  QuantityWithPlainUnit,
  ArbitraryScalable,
} from "cooklang-parser";

const props = defineProps<{
  step: Step;
  recipe: Recipe;
}>();

/**
 * Convert IngredientItemQuantity equivalents to QuantityWithPlainUnit array
 */
function toPlainEquivalents(
  itemQty: IngredientItemQuantity,
): QuantityWithPlainUnit[] | undefined {
  return itemQty.equivalents?.map((eq) => ({
    quantity: eq.quantity,
    unit: eq.unit?.name,
  }));
}

/**
 * Get the first (primary) alternative for an ingredient item
 */
function getPrimaryAlternative(
  item: StepItem & { type: "ingredient" },
): IngredientAlternative | undefined {
  return item.alternatives[0];
}

/**
 * Get the other alternatives (excluding the primary one)
 */
function getOtherAlternatives(
  item: StepItem & { type: "ingredient" },
): IngredientAlternative[] {
  return item.alternatives.slice(1);
}

/**
 * Check if an ingredient item has alternatives
 */
function hasAlternatives(item: StepItem & { type: "ingredient" }): boolean {
  return item.alternatives.length > 1;
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

/**
 * Get the arbitrary scalable by index
 */
function getArbitrary(index: number): ArbitraryScalable | undefined {
  return props.recipe.arbitraries[index];
}
</script>

<template>
  <span class="step-content">
    <template v-for="(item, idx) in step.items" :key="idx">
      <template v-if="item.type === 'text'">{{ item.value }}</template>
      <template v-else-if="item.type === 'ingredient'">
        <span class="font-medium text-green-600 dark:text-green-400">
          <!-- Primary ingredient with quantity -->
          <template v-if="getPrimaryAlternative(item)?.itemQuantity">
            <RecipeQuantityWithEquivalents
              :quantity="getPrimaryAlternative(item)!.itemQuantity!.quantity"
              :unit="getPrimaryAlternative(item)!.itemQuantity!.unit?.name"
              :equivalents="
                toPlainEquivalents(getPrimaryAlternative(item)!.itemQuantity!)
              "
            />
            {{ " " }}
          </template>
          {{ getPrimaryAlternative(item)?.displayName }}
        </span>
        <!-- Alternatives -->
        <template v-if="hasAlternatives(item)">
          <span class="text-gray-500 dark:text-gray-300">
            {{ " " }}(or
            <template
              v-for="(alt, altIdx) in getOtherAlternatives(item)"
              :key="altIdx"
            >
              <template v-if="altIdx > 0">, or </template>
              <template v-if="alt.itemQuantity">
                <RecipeQuantityWithEquivalents
                  :quantity="alt.itemQuantity.quantity"
                  :unit="alt.itemQuantity.unit?.name"
                  :equivalents="toPlainEquivalents(alt.itemQuantity)"
                  wrapper-start="["
                  wrapper-end="]"
                />
                {{ " " }}
              </template>
              <span class="font-medium text-green-600 dark:text-green-400">{{
                alt.displayName
              }}</span>
              <template v-if="alt.note">
                <span class="italic"> - {{ alt.note }}</span>
              </template> </template
            >)
          </span>
        </template>
      </template>
      <template v-else-if="item.type === 'cookware'">
        <span class="font-medium text-blue-600 dark:text-blue-300">{{
          getCookware(item.index)?.name
        }}</span>
      </template>
      <template v-else-if="item.type === 'timer'">
        <RecipeTimerItem
          v-if="getTimer(item.index)"
          :timer="getTimer(item.index)!"
        />
      </template>
      <template v-else-if="item.type === 'arbitrary'">
        <span
          v-if="getArbitrary(item.index)"
          class="font-medium text-purple-600 dark:text-purple-400"
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
