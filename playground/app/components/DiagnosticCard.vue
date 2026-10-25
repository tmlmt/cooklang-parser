<script setup lang="ts">
import { formatCodeFrame } from "cooklang-parser";
import type { Diagnostic } from "cooklang-parser";

defineProps<{
  diagnostic: Diagnostic;
  rawRecipe: string;
}>();
</script>

<template>
  <UCard
    variant="subtle"
    :class="[
      'mb-4 border-[0.5px] text-sm',
      {
        'border-error-400/20 bg-error-400/10 text-error-700 dark:text-error-400':
          diagnostic.severity === 'error',
        'bg-warning-400/10 border-warning-400/50 text-warning-600 dark:border-warning-400/20 dark:text-warning-300':
          diagnostic.severity === 'warning',
      },
    ]"
    :ui="{
      header: 'sm:px-4 py-3',
      footer: 'sm:px-4 py-2',
      body: 'p-0 sm:p-0',
    }"
  >
    <template #header>
      <div>
        <b>{{ diagnostic.severity.toUpperCase() }}[{{ diagnostic.code }}]:</b>
        {{ diagnostic.message }}
      </div>
    </template>
    <pre
      v-if="diagnostic.span"
      class="scrollbar-thumb-error-300/50 scrollbar-thin overflow-auto px-4 pt-3 pb-0 text-xs text-gray-800 dark:text-gray-200"
      >{{ formatCodeFrame(diagnostic.span, rawRecipe) }}</pre>
    <template #footer>
      <div v-if="diagnostic.fix" class="mt-2">
        <strong>Fix:</strong> {{ diagnostic.fix }}
      </div>
      <div v-if="diagnostic.docs" class="mt-2">
        <strong>See: </strong>
        <NuxtLink
          :to="diagnostic.docs"
          target="_blank"
          class="hover:underline"
          >{{ diagnostic.docs }}</NuxtLink
        >
      </div>
    </template>
  </UCard>
</template>
