<script setup lang="ts">
import type { FixedValue, Range } from "cooklang-parser";
import { formatQuantityWithUnit } from "cooklang-parser";

const props = defineProps<{
  quantity?: FixedValue | Range;
  unit?: string;
}>();

const displayText = computed(() => {
  return formatQuantityWithUnit(props.quantity, props.unit);
});
</script>

<template>
  <span class="quantity">{{ displayText }}</span>
</template>
