import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirror the tsconfig `@/* -> ./*` path alias without an extra plugin.
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Keep Vitest from picking up the Playwright E2E specs under e2e/.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
