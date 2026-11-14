import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${root}/` },
      // `server-only` throws outside a React Server Components bundle; tests run in plain Node.
      { find: "server-only", replacement: `${root}/tests/stubs/server-only.ts` },
    ],
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
    // PGlite takes a moment to boot for each integration test file.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
