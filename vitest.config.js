import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["rilen-bot-api/tests/**/*.test.js"],
  },
  resolve: {
    alias: {
      // Importações de JSON sao resolvidas nativamente pelo Vite/Vitest.
    },
  },
});
