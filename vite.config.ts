import { defineConfig } from "vite";

// Static build for GitHub Pages. Output goes to /docs, served from the main branch.
export default defineConfig({
  root: "src/app",
  base: "./",
  publicDir: false,
  build: {
    outDir: "../../docs",
    emptyOutDir: true,
  },
  test: {
    root: ".",
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
});
