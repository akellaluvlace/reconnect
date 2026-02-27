import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockGetValidGoogleToken } = vi.hoisted(() => ({
  mockGetValidGoogleToken: vi.fn(),
}));

vi.mock("@/lib/google/client", () => ({
  getValidGoogleToken: mockGetValidGoogleToken,
}));

import {
  getDriveFileMetadata,
  downloadDriveFile,
} from "@/lib/google/drive";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch;

const SAMPLE_METADATA = {
  id: "abc123",
  name: "interview-recording.vtt",
  mimeType: "text/vtt",
  size: "4096",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Google Drive helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
    mockGetValidGoogleToken.mockResolvedValue("ya29.test-token");
  });

  // -----------------------------------------------------------------------
  // getDriveFileMetadata
  // -----------------------------------------------------------------------

  describe("getDriveFileMetadata", () => {
    it("returns file metadata", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(SAMPLE_METADATA),
      }) as typeof fetch;

      const result = await getDriveFileMetadata("abc123");

      expect(result).toEqual(SAMPLE_METADATA);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/drive/v3/files/abc123?fields=id,name,mimeType,size",
        { headers: { Authorization: "Bearer ya29.test-token" } },
      );
    });

    it("throws on non-ok response", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve("Forbidden"),
      }) as typeof fetch;

      await expect(getDriveFileMetadata("abc123")).rejects.toThrow(
        "Drive API error: 403 Forbidden",
      );
    });
  });

  // -----------------------------------------------------------------------
  // downloadDriveFile
  // -----------------------------------------------------------------------

  describe("downloadDriveFile", () => {
    it("downloads file content as text", async () => {
      const vttContent = "WEBVTT\n\n00:00:01.000 --> 00:00:05.000\nHello";

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(vttContent),
      }) as typeof fetch;

      const result = await downloadDriveFile("file-xyz");

      expect(result).toBe(vttContent);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/drive/v3/files/file-xyz?alt=media",
        { headers: { Authorization: "Bearer ya29.test-token" } },
      );
    });

    it("throws on 404", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve("File not found"),
      }) as typeof fetch;

      await expect(downloadDriveFile("missing-file")).rejects.toThrow(
        "Drive API error: 404 File not found",
      );
    });
  });
});
