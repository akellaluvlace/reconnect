const clientId = process.env.GOOGLE_RECORDING_CLIENT_ID;
const clientSecret = process.env.GOOGLE_RECORDING_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_RECORDING_REDIRECT_URI;

if (!clientId || !clientSecret || !redirectUri) {
  console.warn(
    `[Google] Missing config: CLIENT_ID=${clientId ? "set" : "MISSING"}, ` +
      `CLIENT_SECRET=${clientSecret ? "set" : "MISSING"}, ` +
      `REDIRECT_URI=${redirectUri ? "set" : "MISSING"}`,
  );
}

export const googleClientId = clientId ?? "";
export const googleClientSecret = clientSecret ?? "";
export const googleRedirectUri = redirectUri ?? "";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/meetings.space.readonly",
  "https://www.googleapis.com/auth/drive.meet.readonly",
] as const;
