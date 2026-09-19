import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@pocket": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    restoreMocks: true,
  },
});
