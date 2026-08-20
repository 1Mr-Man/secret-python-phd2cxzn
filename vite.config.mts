import { resolve } from "node:path";
import { defineConfig } from "vite";

/**
 * Two static entry points, both plain HTML + vanilla TS (no framework):
 * `index.html` is the original, validated Au-Cu Quasi-Chemical calculator
 * (untouched by the Workbench addition); `workbench.html` is the generic
 * Materials Physics Workbench that can drive any registered model against
 * any material system. `vite` (dev server) serves either by URL path with
 * no config; this file only matters for `vite build`, which otherwise
 * defaults to `index.html` alone.
 */
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        workbench: resolve(import.meta.dirname, "workbench.html"),
      },
    },
  },
});
