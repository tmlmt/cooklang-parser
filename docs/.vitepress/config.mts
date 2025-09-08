import { defineConfig } from "vitepress";
 // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- avoiding error when developing the docs locally
 // @ts-ignore: linting before typedoc is generated will throw an error here
import typedocSidebar from "../api/typedoc-sidebar.json";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "@tmlmt/cooklang-parser",
  description: "Documentation for the npm package @tmlmt/cooklang-parser",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide-cooklang-specs"},
      { text: "API", link: "/api/classes/Recipe" },
      { text: "Examples", link: "/examples-scaling-recipes" },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Quick start", link: "/api/#quick-start" },
          { text: "Cooklang specs", link: "/guide-cooklang-specs" },
          { text: "Extensions", link: "/guide-extensions" }, 
          { text: "Units and conversions", link: "/guide-units" }, 
        ],
      },
      {
        text: "API",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        items: typedocSidebar,
      },
      {
        text: "Examples",
        items: [
          { text: "Scaling recipes", link: "/examples-scaling-recipes" }, 
          { text: "Creating a shopping list", link: "/examples-shopping-lists" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/tmlmt/cooklang-parser" },
    ],
  },
});
