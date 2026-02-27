import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      GOOGLE_RECORDING_CLIENT_ID: "test-google-client-id",
      GOOGLE_RECORDING_CLIENT_SECRET: "test-google-secret",
      GOOGLE_RECORDING_REDIRECT_URI:
        "http://localhost:3000/api/google/callback",
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
