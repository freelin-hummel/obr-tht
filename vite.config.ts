import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      input: {
        // Background entry point — registered by the OBR manifest.
        main: resolve(__dirname, "index.html"),
        // Popover UIs served to OBR.
        action: resolve(__dirname, "action.html"),
        viewer: resolve(__dirname, "viewer.html"),
        tool: resolve(__dirname, "tool.html"),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
