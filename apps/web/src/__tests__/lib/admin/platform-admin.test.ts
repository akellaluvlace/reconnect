import { describe, it, expect, vi, beforeEach } from "vitest";

describe("isPlatformAdmin", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns true for admin email", async () => {
    vi.stubEnv("PLATFORM_ADMIN_EMAILS", "admin@axil.ie,other@axil.ie");
    const { isPlatformAdmin } = await import("@/lib/admin/platform-admin");
    expect(isPlatformAdmin("admin@axil.ie")).toBe(true);
  });

  it("is case-insensitive", async () => {
    vi.stubEnv("PLATFORM_ADMIN_EMAILS", "Admin@Axil.ie");
    const { isPlatformAdmin } = await import("@/lib/admin/platform-admin");
    expect(isPlatformAdmin("ADMIN@AXIL.IE")).toBe(true);
  });

  it("returns false for non-admin email", async () => {
    vi.stubEnv("PLATFORM_ADMIN_EMAILS", "admin@axil.ie");
    const { isPlatformAdmin } = await import("@/lib/admin/platform-admin");
    expect(isPlatformAdmin("user@example.com")).toBe(false);
  });

  it("returns false for undefined", async () => {
    vi.stubEnv("PLATFORM_ADMIN_EMAILS", "admin@axil.ie");
    const { isPlatformAdmin } = await import("@/lib/admin/platform-admin");
    expect(isPlatformAdmin(undefined)).toBe(false);
  });

  it("returns false for null", async () => {
    vi.stubEnv("PLATFORM_ADMIN_EMAILS", "admin@axil.ie");
    const { isPlatformAdmin } = await import("@/lib/admin/platform-admin");
    expect(isPlatformAdmin(null)).toBe(false);
  });

  it("returns false for empty string", async () => {
    vi.stubEnv("PLATFORM_ADMIN_EMAILS", "admin@axil.ie");
    const { isPlatformAdmin } = await import("@/lib/admin/platform-admin");
    expect(isPlatformAdmin("")).toBe(false);
  });

  it("returns false when env var not set", async () => {
    vi.stubEnv("PLATFORM_ADMIN_EMAILS", "");
    const { isPlatformAdmin } = await import("@/lib/admin/platform-admin");
    expect(isPlatformAdmin("admin@axil.ie")).toBe(false);
  });
});
