<script setup lang="ts">
import type { Cookware } from "cooklang-parser";

defineProps<{
  cookware: Cookware;
}>();
</script>

<template>
  <li class="cookware-item">
    <span v-if="cookware.quantity" class="font-bold">
      <RecipeQuantityDisplay :quantity="cookware.quantity" />
    </span>
    {{ " " }}
    <span class="cookware-name">{{ cookware.name }}</span>
  </li>
</template>
