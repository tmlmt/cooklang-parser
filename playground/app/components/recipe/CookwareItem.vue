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
    <span v-if="cookware.quantity" class="font-bold">
      <RecipeSingleQuantity :quantity="cookware.quantity" />
    </span>
    {{ " " }}
    <span class="cookware-name">{{ cookware.name }}</span>
  </li>
</template>
