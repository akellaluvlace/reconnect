import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@reconnect/database": path.resolve(
        __dirname,
        "../../packages/database/src",
      ),
      "@reconnect/ai": path.resolve(__dirname, "../../packages/ai/src"),
    },
  },
});
