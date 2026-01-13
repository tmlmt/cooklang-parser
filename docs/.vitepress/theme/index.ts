import DefaultTheme from "vitepress/theme";
import type { DefineComponent } from "vue";
import Layout from "./Layout.vue";
import type { Theme } from "vitepress";

export default {
  extends: DefaultTheme,
  Layout: Layout as DefineComponent,
} satisfies Theme;
