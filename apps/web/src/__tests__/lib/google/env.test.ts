import { describe, it, expect } from "vitest";
import {
  googleClientId,
  googleClientSecret,
  googleRedirectUri,
  GOOGLE_SCOPES,
} from "@/lib/google/env";

describe("Google env", () => {
  it("exports env vars from vitest config", () => {
    expect(googleClientId).toBe("test-google-client-id");
    expect(googleClientSecret).toBe("test-google-secret");
    expect(googleRedirectUri).toBe(
      "http://localhost:3000/api/google/callback",
    );
  });

  it("exports 5 OAuth scopes", () => {
    expect(GOOGLE_SCOPES).toHaveLength(5);
    expect(GOOGLE_SCOPES[0]).toBe("openid");
    expect(GOOGLE_SCOPES[1]).toBe("email");
    expect(GOOGLE_SCOPES[2]).toContain("calendar.events");
    expect(GOOGLE_SCOPES[3]).toContain("meetings.space.readonly");
    expect(GOOGLE_SCOPES[4]).toContain("drive.meet.readonly");
  });
});
