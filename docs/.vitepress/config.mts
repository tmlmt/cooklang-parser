import { defineConfig } from "vitepress";
import typedocSidebar from "../api/typedoc-sidebar.json";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Cooklang Parser",
  description: "Documentation for the npm package cooklang-parser",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "API", link: "/api/" },
      { text: "Examples", link: "/markdown-examples" },
    ],

    sidebar: [
      {
        text: "API",
        items: typedocSidebar,
      },
      {
        text: "Examples",
        items: [
          { text: "Parsing recipes", link: "/parsing-recipes-examples" },
          { text: "Creating a shopping list", link: "/shopping-list-examples" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/tmlmt/cooklang-parser" },
    ],
  },
});
