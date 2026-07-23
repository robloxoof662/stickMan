import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
  build: {
    target: "safari15",
  },
});
