import { defineConfig } from "vite";

// Static build for GitHub Pages. The deploy workflow builds dist/ and publishes it;
// nothing built is committed. Site data is generated into src/app/public/data/.
export default defineConfig({
  root: "src/app",
  base: "./",
  publicDir: "public",
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
  test: {
    root: ".",
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
});
