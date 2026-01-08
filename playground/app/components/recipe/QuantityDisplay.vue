<script setup lang="ts">
import type {
  FixedValue,
  Range,
  TextValue,
  DecimalValue,
  FractionValue,
} from "cooklang-parser";

const props = defineProps<{
  quantity: FixedValue | Range;
  unit?: string;
}>();

function formatNumericValue(value: DecimalValue | FractionValue): string {
  if (value.type === "decimal") {
    return String(value.decimal);
  }
  return `${value.num}/${value.den}`;
}

function formatSingleValue(
  value: TextValue | DecimalValue | FractionValue,
): string {
  if (value.type === "text") {
    return value.text;
  }
  return formatNumericValue(value);
}

const formattedQuantity = computed(() => {
  if (props.quantity.type === "fixed") {
    return formatSingleValue(props.quantity.value);
  }
  // Range
  const minStr = formatNumericValue(props.quantity.min);
  const maxStr = formatNumericValue(props.quantity.max);
  return `${minStr}-${maxStr}`;
});

const displayText = computed(() => {
  if (props.unit) {
    return `${formattedQuantity.value} ${props.unit}`;
  }
  return formattedQuantity.value;
});
</script>

<template>
  <span class="quantity">{{ displayText }}</span>
</template>
