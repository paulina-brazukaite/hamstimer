import { defineConfig } from "vitest/config";

// Unit tests for plain TypeScript modules (no DOM needed yet).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
