// Created at: 2026-10-16 01:48
import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "./src/core"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@state": path.resolve(__dirname, "./src/state"),
      "@ui": path.resolve(__dirname, "./src/ui"),
      "@styles": path.resolve(__dirname, "./src/styles")
    }
  },
  server: {
    port: 3000,
    open: false
  },
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "tests/", "scratch/", "_Assets/"]
    }
  }
});
