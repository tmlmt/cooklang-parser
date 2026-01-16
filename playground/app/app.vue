<script setup lang="ts">
useSeoMeta({
  title: "Cooklang Parser Playground",
  ogTitle: "Cooklang Parser Playground",
  description:
    "An interactive playground for the Cooklang Parser library @tmlmt/cooklang-parser, allowing you to edit and render Cooklang recipes in real-time.",
  ogDescription:
    "An interactive playground for the Cooklang Parser library @tmlmt/cooklang-parser.",
});
</script>

<template>
  <UApp :toaster="{ position: 'top-right' }">
    <NuxtPage />
  </UApp>
</template>
