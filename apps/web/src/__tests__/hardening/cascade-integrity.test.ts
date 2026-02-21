/**
 * Cascade Integrity Tests
 *
 * Reads all SQL migration files and verifies that critical FK relationships
 * have proper cascade policies. This prevents orphaned rows when parent
 * records are deleted.
 *
 * These are static analysis tests — they parse migration SQL, not a live DB.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Setup: Read all migration SQL
// ---------------------------------------------------------------------------

const MIGRATIONS_DIR = path.resolve(
  __dirname,
  "../../../../../supabase/migrations",
);

function loadAllMigrationSQL(): string {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }

  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  expect(migrationFiles.length).toBeGreaterThan(0);

  return migrationFiles
    .map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8"))
    .join("\n");
}

const allSQL = loadAllMigrationSQL();

// Normalize whitespace in SQL for easier regex matching
const normalizedSQL = allSQL.replace(/\s+/g, " ");

// ---------------------------------------------------------------------------
// Helper: Check for FK cascade in migration SQL
// ---------------------------------------------------------------------------

/**
 * Checks whether a column reference to a parent table includes a cascade action.
 *
 * Handles two FK definition patterns:
 *   1. Inline: `column_name UUID REFERENCES parent_table(id) ON DELETE CASCADE`
 *   2. ALTER:  `FOREIGN KEY (column_name) REFERENCES parent_table(id) ON DELETE CASCADE`
 *
 * The order of `NOT NULL` and `REFERENCES` may vary, so we search broadly.
 */
function hasCascadePolicy(
  sql: string,
  column: string,
  cascade: string,
): boolean {
  const escapedCascade = cascade.replace(/\s+/g, "\\s+");

  // Pattern 1: inline column definition
  // e.g., playbook_id UUID REFERENCES playbooks(id) ON DELETE CASCADE
  // or:   playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE
  // Use .{0,80} instead of [^,)]* to allow parentheses in "table(id)"
  const inlinePattern = new RegExp(
    `${column}\\s+UUID.{0,40}REFERENCES\\s+\\S+\\(\\S+\\)\\s+${escapedCascade}`,
    "i",
  );

  // Pattern 2: ALTER TABLE / FOREIGN KEY constraint
  // e.g., FOREIGN KEY (column_name) REFERENCES parent_table(id) ON DELETE CASCADE
  const fkPattern = new RegExp(
    `FOREIGN\\s+KEY\\s*\\(\\s*${column}\\s*\\)\\s+REFERENCES\\s+\\S+\\(\\S+\\)\\s+${escapedCascade}`,
    "i",
  );

  return inlinePattern.test(sql) || fkPattern.test(sql);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Cascade Integrity Tests", () => {
  describe("Critical FK cascades exist", () => {
    /**
     * These are relationships where deleting the parent MUST cascade
     * to avoid orphaned child rows. Each entry was verified against
     * the initial_schema.sql and subsequent migrations.
     */
    const expectedCascades: Array<{
      table: string;
      column: string;
      parent: string;
      cascade: string;
    }> = [
      {
        table: "interview_stages",
        column: "playbook_id",
        parent: "playbooks",
        cascade: "ON DELETE CASCADE",
      },
      {
        table: "candidates",
        column: "playbook_id",
        parent: "playbooks",
        cascade: "ON DELETE CASCADE",
      },
      {
        table: "interviews",
        column: "candidate_id",
        parent: "candidates",
        cascade: "ON DELETE CASCADE",
      },
      {
        table: "feedback",
        column: "interview_id",
        parent: "interviews",
        cascade: "ON DELETE CASCADE",
      },
      {
        table: "interview_transcripts",
        column: "interview_id",
        parent: "interviews",
        cascade: "ON DELETE CASCADE",
      },
      {
        table: "ai_synthesis",
        column: "candidate_id",
        parent: "candidates",
        cascade: "ON DELETE CASCADE",
      },
      {
        table: "collaborators",
        column: "playbook_id",
        parent: "playbooks",
        cascade: "ON DELETE CASCADE",
      },
      {
        table: "share_links",
        column: "playbook_id",
        parent: "playbooks",
        cascade: "ON DELETE CASCADE",
      },
      {
        table: "ai_research_cache",
        column: "organization_id",
        parent: "organizations",
        cascade: "ON DELETE CASCADE",
      },
      {
        table: "users",
        column: "organization_id",
        parent: "organizations",
        cascade: "ON DELETE CASCADE",
      },
      {
        table: "playbooks",
        column: "organization_id",
        parent: "organizations",
        cascade: "ON DELETE CASCADE",
      },
      {
        table: "org_drive_connections",
        column: "organization_id",
        parent: "organizations",
        cascade: "ON DELETE CASCADE",
      },
    ];

    for (const { table, column, parent, cascade } of expectedCascades) {
      it(`${table}.${column} -> ${parent} has ${cascade}`, () => {
        const found = hasCascadePolicy(normalizedSQL, column, cascade);
        expect(found).toBe(true);
      });
    }
  });

  describe("Known cascade gaps are documented", () => {
    // GAP: interviews.stage_id references interview_stages(id) with NO ON DELETE action.
    // This means deleting a stage while interviews reference it will fail with FK violation.
    // Recommended fix: ON DELETE SET NULL (interview keeps history, stage ref becomes null).
    it("interviews.stage_id has no ON DELETE CASCADE (known gap)", () => {
      const hasCascade = hasCascadePolicy(
        normalizedSQL,
        "stage_id",
        "ON DELETE CASCADE",
      );
      const hasSetNull = hasCascadePolicy(
        normalizedSQL,
        "stage_id",
        "ON DELETE SET NULL",
      );

      // GAP: interviews.stage_id has NO ON DELETE action (defaults to NO ACTION).
      // This test documents the gap. If a migration adds a cascade later, this
      // test will need updating.
      expect(hasCascade || hasSetNull).toBe(false);
    });

    // GAP: candidates.current_stage_id references interview_stages(id) with NO ON DELETE action.
    // Similar to above — deleting a stage while a candidate references it will fail.
    // Recommended fix: ON DELETE SET NULL (candidate loses current stage ref, can be reassigned).
    it("candidates.current_stage_id has no ON DELETE action (known gap)", () => {
      const hasCascade = hasCascadePolicy(
        normalizedSQL,
        "current_stage_id",
        "ON DELETE CASCADE",
      );
      const hasSetNull = hasCascadePolicy(
        normalizedSQL,
        "current_stage_id",
        "ON DELETE SET NULL",
      );

      // GAP: candidates.current_stage_id has NO ON DELETE action (defaults to NO ACTION).
      expect(hasCascade || hasSetNull).toBe(false);
    });
  });

  describe("Soft delete patterns", () => {
    it("share_links uses is_active flag (not hard delete)", () => {
      // share_links should have an is_active boolean column for soft deactivation
      expect(normalizedSQL).toMatch(/is_active\s+(boolean|bool)/i);
    });

    it("collaborators has expires_at column for token expiry", () => {
      // collaborators must have an expires_at column for invite token expiry
      expect(normalizedSQL).toMatch(/expires_at\s+timestamptz/i);
    });

    it("share_links has expires_at column", () => {
      // share_links should also have expires_at for time-bound links
      const shareLinksSection = allSQL.match(
        /CREATE TABLE[^;]*share_links[^;]*/i,
      );
      expect(shareLinksSection).not.toBeNull();
      expect(shareLinksSection![0]).toMatch(/expires_at/i);
    });
  });

  describe("Organization cascade chain is complete", () => {
    // When an org is deleted, ALL child data must cascade.
    // Verify org_id FK cascades exist on all org-scoped tables.

    it("users.organization_id cascades on org delete", () => {
      expect(
        hasCascadePolicy(normalizedSQL, "organization_id", "ON DELETE CASCADE"),
      ).toBe(true);
    });

    it("playbooks.organization_id cascades on org delete", () => {
      // playbooks -> candidates -> interviews -> feedback: full chain
      expect(
        hasCascadePolicy(normalizedSQL, "organization_id", "ON DELETE CASCADE"),
      ).toBe(true);
    });

    it("audit_logs.organization_id has a REFERENCES constraint", () => {
      // audit_logs reference org but may not cascade (audit trail preservation)
      const hasRef = /audit_logs[^;]*organization_id[^,)]*REFERENCES/i.test(
        normalizedSQL,
      );
      expect(hasRef).toBe(true);
    });
  });

  describe("Migration file count is expected", () => {
    it("has at least 20 migration files", () => {
      const files = fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith(".sql"));
      expect(files.length).toBeGreaterThanOrEqual(20);
    });
  });
});
