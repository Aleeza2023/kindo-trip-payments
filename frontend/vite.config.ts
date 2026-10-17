import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The browser only talks to the Vite server, which forwards /api to the backend.
    // Same address for both, so the browser has no cross-origin (CORS) problem.
    proxy: { "/api": "http://localhost:8000" },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test-utils/setup.ts",
  },
});
