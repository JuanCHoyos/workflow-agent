import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./test/dynamodb-local.ts"],
    testTimeout: 20_000,
    hookTimeout: 120_000,
  },
});
