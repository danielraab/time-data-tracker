import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
      // server-only throws in non-Next.js environments; in tests we just need it to be a no-op
      "server-only": resolve(__dirname, "./test/server-only-stub.ts"),
    },
  },
});
