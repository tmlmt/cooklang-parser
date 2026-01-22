<script setup lang="ts">
import type {
  Recipe,
  Step,
  Timer,
  IngredientAlternative,
  IngredientItemQuantity,
  QuantityWithPlainUnit,
  ArbitraryScalable,
  RecipeChoices,
  IngredientItem,
} from "cooklang-parser";
import { isAlternativeSelected } from "cooklang-parser";

const props = defineProps<{
  step: Step;
  recipe: Recipe;
  choices?: RecipeChoices;
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
 * Check if this is a grouped alternative (vs inline)
 */
function isGroupedItem(item: IngredientItem): boolean {
  return item.group !== undefined;
}

/**
 * For inline alternatives: check if a choice has been made for this item
 */
function hasInlineChoice(item: IngredientItem): boolean {
  return props.choices?.ingredientItems?.has(item.id) ?? false;
}

/**
 * For grouped alternatives: check if a choice has been made for this group
 */
function hasGroupChoice(item: IngredientItem): boolean {
  if (!item.group) return false;
  return props.choices?.ingredientGroups?.has(item.group) ?? false;
}

/**
 * Check if this grouped item is selected (using the library helper)
 * Returns true if no choice made (show all) or if this item is the selected one
 */
function isGroupedItemSelected(item: IngredientItem): boolean {
  if (!hasGroupChoice(item)) return true; // No choice made, all are "selected"
  return isAlternativeSelected(props.recipe, props.choices ?? {}, item);
}

/**
 * Get visible alternatives for an inline item based on choices
 * Returns all alternatives if no choice made, otherwise only the selected one
 */
function getVisibleAlternatives(
  item: IngredientItem,
): { alt: IngredientAlternative; originalIndex: number }[] {
  if (!hasInlineChoice(item)) {
    // No choice made, return all alternatives
    return item.alternatives.map((alt, idx) => ({ alt, originalIndex: idx }));
  }
  // Choice made, return only the selected alternative(s)
  return item.alternatives
    .map((alt, idx) => ({ alt, originalIndex: idx }))
    .filter(({ originalIndex }) =>
      isAlternativeSelected(
        props.recipe,
        props.choices ?? {},
        item,
        originalIndex,
      ),
    );
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
        <!-- Grouped alternative: single ingredient, may have strikethrough -->
        <template v-if="isGroupedItem(item)">
          <span
            :class="[
              'font-medium text-green-600 dark:text-green-400',
              {
                'line-through opacity-50': !isGroupedItemSelected(item),
              },
            ]"
          >
            <template v-if="item.alternatives[0]?.itemQuantity">
              <RecipeQuantityWithEquivalents
                :quantity="item.alternatives[0]!.itemQuantity!.quantity"
                :unit="item.alternatives[0]!.itemQuantity!.unit?.name"
                :equivalents="
                  toPlainEquivalents(item.alternatives[0]!.itemQuantity!)
                "
              />
              {{ " " }}
            </template>
            {{ item.alternatives[0]?.displayName }}
          </span>
        </template>
        <!-- Inline alternatives: show selected or all -->
        <template v-else>
          <template
            v-for="(visibleAlt, visIdx) in getVisibleAlternatives(item)"
            :key="visibleAlt.originalIndex"
          >
            <!-- Separator for multiple alternatives -->
            <span v-if="visIdx > 0" class="text-gray-500 dark:text-gray-300">
              {{ " " }}(or
            </span>
            <span
              :class="[
                'font-medium text-green-600 dark:text-green-400',
                { 'text-gray-500 dark:text-gray-300': visIdx > 0 },
              ]"
            >
              <template v-if="visibleAlt.alt.itemQuantity">
                <RecipeQuantityWithEquivalents
                  :quantity="visibleAlt.alt.itemQuantity.quantity"
                  :unit="visibleAlt.alt.itemQuantity.unit?.name"
                  :equivalents="toPlainEquivalents(visibleAlt.alt.itemQuantity)"
                  :wrapper-start="visIdx > 0 ? '[' : undefined"
                  :wrapper-end="visIdx > 0 ? ']' : undefined"
                />
                {{ " " }}
              </template>
              <span
                :class="{
                  'font-medium text-green-600 dark:text-green-400':
                    visIdx === 0,
                }"
                >{{ visibleAlt.alt.displayName }}</span
              >
              <template v-if="visibleAlt.alt.note && !hasInlineChoice(item)">
                <span
                  class="font-normal text-gray-500 italic dark:text-gray-300"
                >
                  {{ " " }}- {{ visibleAlt.alt.note }}
                </span>
              </template>
            </span>
            <!-- Closing parenthesis for alternatives -->
            <span v-if="visIdx > 0" class="text-gray-500 dark:text-gray-300"
              >)</span
            >
          </template>
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
