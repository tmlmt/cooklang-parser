<script setup lang="ts">
import type { FixedValue, Range, QuantityWithPlainUnit } from "cooklang-parser";

const props = withDefaults(
  defineProps<{
    quantity: FixedValue | Range;
    unit?: string;
    equivalents?: QuantityWithPlainUnit[];
    wrapperStart?: string;
    wrapperEnd?: string;
  }>(),
  {
    unit: undefined,
    equivalents: undefined,
    wrapperStart: "(",
    wrapperEnd: ")",
  },
);

const hasEquivalents = computed(
  () => props.equivalents && props.equivalents.length > 0,
);
</script>

<template>
  <span class="quantity-with-equivalents">
    <RecipeSingleQuantity :quantity="quantity" :unit="unit" />
    <template v-if="hasEquivalents"
      >{{ " " }}{{ wrapperStart
      }}<template v-for="(equiv, index) in equivalents" :key="index"
        ><template v-if="index > 0">, </template
        ><RecipeSingleQuantity
          :quantity="equiv.quantity"
          :unit="equiv.unit" /></template
      >{{ wrapperEnd }}</template
    >
  </span>
</template>
