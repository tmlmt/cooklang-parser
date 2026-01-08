<script setup lang="ts">
import type {
  Ingredient,
  QuantityWithPlainUnit,
  MaybeNestedGroup,
} from "cooklang-parser";

const props = defineProps<{
  ingredient: Ingredient;
}>();

/**
 * Extracts the first/primary quantity from potentially nested groups
 */
function getPrimaryQuantity(
  q:
    | QuantityWithPlainUnit
    | MaybeNestedGroup<QuantityWithPlainUnit>
    | undefined,
): { quantity: QuantityWithPlainUnit["quantity"]; unit?: string } | undefined {
  if (!q) return undefined;

  // If it's a group (has 'type' and 'quantities'), recurse into the first item
  if ("type" in q && "quantities" in q && Array.isArray(q.quantities)) {
    return getPrimaryQuantity(
      q.quantities[0] as
        | QuantityWithPlainUnit
        | MaybeNestedGroup<QuantityWithPlainUnit>,
    );
  }

  // It's a plain QuantityWithPlainUnit
  const plain = q as QuantityWithPlainUnit;
  return {
    quantity: plain.quantity,
    unit: plain.unit,
  };
}

const primaryQuantity = computed(() => {
  return getPrimaryQuantity(props.ingredient.quantityTotal);
});
</script>

<template>
  <li class="ingredient-item">
    <span v-if="primaryQuantity" class="font-bold">
      <RecipeQuantityDisplay
        :quantity="primaryQuantity.quantity"
        :unit="primaryQuantity.unit"
      />
    </span>
    {{ " " }}
    <span class="ingredient-name">{{ ingredient.name }}</span>
    <span v-if="ingredient.preparation" class="text-gray-500">
      , {{ ingredient.preparation }}
    </span>
  </li>
</template>
