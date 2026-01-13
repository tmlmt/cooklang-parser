<script setup lang="ts">
import type { QuantityWithPlainUnit } from "cooklang-parser";

const props = withDefaults(
  defineProps<{
    quantity: QuantityWithPlainUnit;
    wrapperStart?: string;
    wrapperEnd?: string;
  }>(),
  {
    wrapperStart: "(",
    wrapperEnd: ")",
  },
);

const hasEquivalents = computed(
  () => props.quantity.equivalents && props.quantity.equivalents.length > 0,
);
</script>

<template>
  <span class="quantity-with-equivalents">
    <RecipeSingleQuantity :quantity="quantity.quantity" :unit="quantity.unit" />
    <template v-if="hasEquivalents"
      >{{ " " }}{{ wrapperStart
      }}<template v-for="(equiv, index) in quantity.equivalents" :key="index"
        ><template v-if="index > 0">, </template
        ><RecipeSingleQuantity
          :quantity="equiv.quantity"
          :unit="equiv.unit" /></template
      >{{ wrapperEnd }}</template
    >
  </span>
</template>
