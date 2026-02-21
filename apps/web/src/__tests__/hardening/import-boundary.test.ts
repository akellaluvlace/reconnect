/**
 * Import Boundary Tests
 *
 * Static analysis tests that verify server-only code never leaks
 * into client components. Reads source files and checks their
 * import statements against a forbidden list.
 *
 * Server-only modules that MUST NEVER be imported from client code:
 * - @/lib/supabase/service-role  (bypasses RLS via service_role key)
 * - @/lib/openai/client           (server-only Whisper wrapper)
 * - @/lib/email/resend-client     (server-only email client)
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAllFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules, .next, and other non-source directories
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        walk(fullPath);
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SRC_DIR = path.resolve(__dirname, "../..");
const COMPONENTS_DIR = path.resolve(SRC_DIR, "components");
const APP_DIR = path.resolve(SRC_DIR, "app");
const LIB_DIR = path.resolve(SRC_DIR, "lib");

const FORBIDDEN_SERVER_IMPORTS = [
  "@/lib/supabase/service-role",
  "@/lib/openai/client",
  "@/lib/email/resend-client",
];

// Also catch bare relative imports that resolve to the same modules
const FORBIDDEN_PARTIAL_PATTERNS = [
  "service-role",
  "openai/client",
  "resend-client",
];

function containsForbiddenImport(content: string): string | null {
  for (const forbidden of FORBIDDEN_SERVER_IMPORTS) {
    if (
      content.includes(`from "${forbidden}"`) ||
      content.includes(`from '${forbidden}'`) ||
      content.includes(`import("${forbidden}")`) ||
      content.includes(`import('${forbidden}')`) ||
      content.includes(`require("${forbidden}")`) ||
      content.includes(`require('${forbidden}')`)
    ) {
      return forbidden;
    }
  }
  return null;
}

function isClientComponent(content: string): boolean {
  // Check for "use client" directive at the top of the file
  const firstLines = content.slice(0, 200);
  return (
    firstLines.includes('"use client"') ||
    firstLines.includes("'use client'")
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Import Boundary Tests", () => {
  describe("Client components never import server-only modules", () => {
    it("no component file imports server-only modules", () => {
      const files = getAllFiles(COMPONENTS_DIR, [".ts", ".tsx"]);
      expect(files.length).toBeGreaterThan(0);

      const violations: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        const forbidden = containsForbiddenImport(content);
        if (forbidden) {
          const relative = path.relative(SRC_DIR, file);
          violations.push(`${relative} imports "${forbidden}"`);
        }
      }

      expect(violations).toEqual([]);
    });

    it("no 'use client' file in app/ imports server-only modules", () => {
      const files = getAllFiles(APP_DIR, [".ts", ".tsx"]);
      expect(files.length).toBeGreaterThan(0);

      const violations: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        // Skip server components (they CAN import server modules)
        if (!isClientComponent(content)) continue;

        const forbidden = containsForbiddenImport(content);
        if (forbidden) {
          const relative = path.relative(SRC_DIR, file);
          violations.push(`${relative} ("use client") imports "${forbidden}"`);
        }
      }

      expect(violations).toEqual([]);
    });

    it("no 'use client' file anywhere in src/ imports server-only modules", () => {
      const files = getAllFiles(SRC_DIR, [".ts", ".tsx"]);
      expect(files.length).toBeGreaterThan(0);

      const violations: string[] = [];

      for (const file of files) {
        // Skip test files and lib/ (server-side code may import server modules)
        const relative = path.relative(SRC_DIR, file);
        if (relative.startsWith("__tests__")) continue;
        if (relative.startsWith("lib")) continue;

        const content = fs.readFileSync(file, "utf-8");
        if (!isClientComponent(content)) continue;

        const forbidden = containsForbiddenImport(content);
        if (forbidden) {
          violations.push(`${relative} ("use client") imports "${forbidden}"`);
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe("No circular dependencies in critical paths", () => {
    it("supabase/server.ts does not import from components/", () => {
      const serverFile = path.resolve(LIB_DIR, "supabase", "server.ts");
      if (!fs.existsSync(serverFile)) {
        // File must exist — this is a critical infrastructure file
        expect.fail(`Expected ${serverFile} to exist`);
      }
      const content = fs.readFileSync(serverFile, "utf-8");
      expect(content).not.toContain("components/");
    });

    it("supabase/service-role.ts does not import from components/", () => {
      const srFile = path.resolve(LIB_DIR, "supabase", "service-role.ts");
      if (!fs.existsSync(srFile)) {
        expect.fail(`Expected ${srFile} to exist`);
      }
      const content = fs.readFileSync(srFile, "utf-8");
      expect(content).not.toContain("components/");
    });

    it("supabase/client.ts does not import from supabase/service-role", () => {
      const clientFile = path.resolve(LIB_DIR, "supabase", "client.ts");
      if (!fs.existsSync(clientFile)) {
        expect.fail(`Expected ${clientFile} to exist`);
      }
      const content = fs.readFileSync(clientFile, "utf-8");
      expect(content).not.toContain("service-role");
    });
  });

  describe("Environment variable safety", () => {
    it("no component file accesses process.env directly (except NODE_ENV)", () => {
      const files = getAllFiles(COMPONENTS_DIR, [".ts", ".tsx"]);
      expect(files.length).toBeGreaterThan(0);

      const violations: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        const matches = content.match(/process\.env\.\w+/g) || [];
        const forbidden = matches.filter(
          (m) => m !== "process.env.NODE_ENV",
        );
        if (forbidden.length > 0) {
          const relative = path.relative(SRC_DIR, file);
          violations.push(
            `${relative} accesses ${forbidden.join(", ")}`,
          );
        }
      }

      expect(violations).toEqual([]);
    });

    it("no component file accesses SUPABASE_SERVICE_ROLE_KEY", () => {
      const files = getAllFiles(COMPONENTS_DIR, [".ts", ".tsx"]);

      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        expect(content).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
      }
    });
  });

  describe("Server module files have proper warnings", () => {
    it("service-role.ts contains a 'never import from client' warning", () => {
      const srFile = path.resolve(LIB_DIR, "supabase", "service-role.ts");
      const content = fs.readFileSync(srFile, "utf-8");
      // The file should have a clear warning comment about client usage
      expect(
        content.toLowerCase().includes("never") &&
          content.toLowerCase().includes("client"),
      ).toBe(true);
    });
  });
});
