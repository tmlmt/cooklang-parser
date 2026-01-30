import { defineConfig } from "vitepress";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- avoiding error when developing the docs locally
// @ts-ignore: linting before typedoc is generated will throw an error here
import typedocSidebar from "../api/typedoc-sidebar.json";
import { fullVersion, majorVersion, majorNumber } from "./version";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "@tmlmt/cooklang-parser",
  description: "Documentation for the npm package @tmlmt/cooklang-parser",
  base: `/${majorVersion}/`,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide-cooklang-specs" },
      { text: "API", link: "/api/classes/Recipe" },
      { text: "Examples", link: "/examples-scaling-recipes" },
      { text: "Playground", link: "/../playground/", target: "_self" },
      {
        text: fullVersion,
        items: [
          { text: fullVersion, link: "/" },
          {
            text: majorNumber === 2 ? "v3" : "v2",
            link: `../${majorNumber === 2 ? "v3" : "v2"}/`,
            target: "_self",
          },
        ],
      },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Quick start", link: "/api/#quick-start" },
          { text: "Cooklang specs", link: "/guide-cooklang-specs" },
          { text: "Extensions", link: "/guide-extensions" }, 
          { text: "Unit conversion", link: "/guide-unit-conversion" }, 
        ],
        collapsed: true
      },
      {
        text: "API",
        items: [
          { 
            text: "Reference",
            items: [
              { 
                text: "Units definition", link: "/reference-units" 
              }
            ],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          }, ...typedocSidebar],
        collapsed: true
      },
      {
        text: "Examples",
        items: [
          { text: "Scaling recipes", link: "/examples-scaling-recipes" }, 
          { text: "Creating a shopping list", link: "/examples-shopping-lists" },
        ],
        collapsed: true
      },
    ],

    socialLinks: [
      { 
        icon: "github", 
        link: "https://github.com/tmlmt/cooklang-parser", 
        ariaLabel: "Link to Github page of cooklang-parser package" 
      },
      { 
        icon: "npm", 
        link: "https://www.npmjs.com/package/@tmlmt/cooklang-parser", 
        ariaLabel: "Link to npm page of cooklang-parser package" 
      },
      {
        icon: { 
          svg: "<svg width='13.823566mm' height='10.217162mm' viewBox='0 0 13.823566 10.217162' version='1.1' id='svg5' inkscape:version='1.2.2 (732a01da63, 2022-12-09, custom)' sodipodi:docname='logo.svg' xmlns:inkscape='http://www.inkscape.org/namespaces/inkscape' xmlns:sodipodi='http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd' xmlns='http://www.w3.org/2000/svg' xmlns:svg='http://www.w3.org/2000/svg'><sodipodi:namedview id='namedview7' pagecolor='#ffffff' bordercolor='#666666' borderopacity='1.0' inkscape:showpageshadow='2' inkscape:pageopacity='0.0' inkscape:pagecheckerboard='0' inkscape:deskcolor='#d1d1d1' inkscape:document-units='mm' showgrid='false' inkscape:zoom='11.313708' inkscape:cx='42.77996' inkscape:cy='30.626563' inkscape:window-width='2560' inkscape:window-height='1376' inkscape:window-x='0' inkscape:window-y='0' inkscape:window-maximized='1' inkscape:current-layer='layer1' /><defs id='defs2' /><g inkscape:label='Layer 1' inkscape:groupmode='layer' id='layer1' transform='translate(-55.032706,-33.484852)'><circle style='fill:none;stroke:#424242;stroke-width:0.57389;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1' id='path1151-3' cx='65.996391' cy='38.593433' r='2.5729363' /><circle style='fill:#424242;fill-opacity:1;stroke:none;stroke-width:0.471;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1' id='path2742-6' cx='65.996391' cy='34.090237' r='0.60538417' /><circle style='fill:none;stroke:#424242;stroke-width:0.57389;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1' id='path1151-3-5' cx='57.89259' cy='-38.593433' r='2.5729363' transform='scale(1,-1)' /><circle style='fill:#424242;fill-opacity:1;stroke:none;stroke-width:0.471;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1' id='path2742-6-3' cx='57.89259' cy='-43.09663' r='0.60538417' transform='scale(1,-1)' /></g></svg>" 
        }, 
        link: "https://www.tmlmt.com",
        ariaLabel: "Link to personal website"
      }
    ],
  },
});
