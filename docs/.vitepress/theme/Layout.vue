<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import { isPrerelease, majorVersion } from "../version";
import { isProd, siteUrl } from "../constants";

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #layout-top>
      <div v-if="isPrerelease" class="prerelease-banner top-banner">
        ⚠️ This is pre-release documentation for {{ majorVersion }}. For stable docs,
        visit <a :href="isProd ? `${siteUrl}/v2/` : `/v2/`">v2</a>.
      </div>
      <component v-if="isPrerelease" :is="'style'">
        :root { --vp-layout-top-height: 37px; }
        .VPHome { margin-bottom: 96px !important; }
      </component>
    </template>
  </Layout>
</template>

<style scoped>
.prerelease-banner.top-banner {
  background: #fff3cd;
  border-bottom: 1px solid #ffc107;
  color: #856404;
  padding: 0.5rem 1rem;
  text-align: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
}

.prerelease-banner a {
  color: #533f03;
  font-weight: 600;
  text-decoration: underline;
}

.prerelease-banner a:hover {
  color: #1a1400;
}
</style>
