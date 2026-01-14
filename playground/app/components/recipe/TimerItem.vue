<script setup lang="ts">
import type { Timer, DecimalValue, FractionValue } from "cooklang-parser";

const props = defineProps<{
  timer: Timer;
}>();

function formatNumericValue(value: DecimalValue | FractionValue): string {
  if (value.type === "decimal") {
    return String(value.decimal);
  }
  return `${value.num}/${value.den}`;
}

const formattedDuration = computed(() => {
  const duration = props.timer.duration;
  if (duration.type === "fixed") {
    const val = duration.value;
    if (val.type === "text") {
      return val.text;
    }
    return formatNumericValue(val);
  }
  // Range
  const minStr = formatNumericValue(duration.min);
  const maxStr = formatNumericValue(duration.max);
  return `${minStr}-${maxStr}`;
});
</script>

<template>
  <span class="timer-item">
    <span class="font-bold">{{ formattedDuration }} {{ timer.unit }}</span>
    <span v-if="timer.name" class="text-gray-500 dark:text-gray-300">
      ({{ timer.name }})</span
    >
  </span>
</template>
