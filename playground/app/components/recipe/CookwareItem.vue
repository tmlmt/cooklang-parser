<script setup lang="ts">
import type { Cookware } from "cooklang-parser";

const props = defineProps<{
  cookware: Cookware;
  isOptional?: boolean;
}>();

const optionalPrefix = computed(() => (props.isOptional ? "(optional) " : ""));
</script>

<template>
  <li class="cookware-item">
    {{ optionalPrefix }}
    <span v-for="(quantity, i) in cookware.quantities" :key="i">
      <template v-if="i > 0">{{ " + " }}</template>
      <RecipeSingleQuantity :quantity="quantity" />
    </span>
    {{ " " }}
    <span class="cookware-name font-bold">{{ cookware.name }}</span>
  </li>
</template>
