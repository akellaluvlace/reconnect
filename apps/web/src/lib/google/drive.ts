import { getValidGoogleToken } from "@/lib/google/client";
import { traceGoogleApi } from "./pipeline-tracer";
import { sanitizeErrorBody } from "./utils";

const DRIVE_API = "https://www.googleapis.com/drive/v3/files";

/**
 * Metadata fields returned by the Drive API for a file.
 */
export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size: string;
}

/**
 * Fetch file metadata from Google Drive.
 * Returns id, name, mimeType, and size for the given file.
 */
export async function getDriveFileMetadata(
  fileId: string,
): Promise<DriveFileMetadata> {
  const token = await getValidGoogleToken();

  const start = Date.now();
  const response = await fetch(
    `${DRIVE_API}/${fileId}?fields=id,name,mimeType,size`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  traceGoogleApi("drive", "GET metadata", response.status, Date.now() - start, {
    fileId,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Drive API error: ${response.status} ${sanitizeErrorBody(message)}`);
  }

  return (await response.json()) as DriveFileMetadata;
}

/**
 * Download file content from Google Drive as raw text.
 * Uses the `alt=media` parameter to retrieve file bytes.
 * For VTT/SBV transcript files from manual uploads.
 */
export async function downloadDriveFile(fileId: string): Promise<string> {
  const token = await getValidGoogleToken();

  const start = Date.now();
  const response = await fetch(`${DRIVE_API}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  traceGoogleApi(
    "drive",
    "GET alt=media",
    response.status,
    Date.now() - start,
    { fileId },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Drive API error: ${response.status} ${sanitizeErrorBody(message)}`);
  }

  return response.text();
}

/**
 * Search Google Drive for a Meet transcript doc by meeting code.
 * Google saves transcripts as Google Docs with the meeting name in the title.
 * Returns the doc ID if found, null otherwise.
 */
export async function searchDriveForTranscript(
  meetingCode: string,
): Promise<string | null> {
  const token = await getValidGoogleToken();

  // Google saves Meet transcripts with titles like "Meeting transcript - cin-usuj-fjq"
  const query = encodeURIComponent(
    `name contains '${meetingCode}' and mimeType = 'application/vnd.google-apps.document' and trashed = false`,
  );
  const start = Date.now();
  const res = await fetch(
    `${DRIVE_API}?q=${query}&fields=files(id,name,createdTime)&orderBy=createdTime desc&pageSize=1`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  traceGoogleApi("drive", "GET files.list (transcript search)", res.status, Date.now() - start, {
    meetingCode,
  });

  if (!res.ok) {
    const body = await res.text();
    const sanitized = sanitizeErrorBody(body);
    if (res.status === 404) {
      console.log(`[GOOGLE:drive] Transcript search 404 for meetingCode=${meetingCode}`);
      return null;
    }
    throw new Error(`Drive transcript search failed: ${res.status} ${sanitized}`);
  }

  const data = (await res.json()) as {
    files?: Array<{ id: string; name: string; createdTime: string }>;
  };

  const file = data.files?.[0];
  if (file) {
    console.log(`[TRACE:drive:search] Found transcript doc: ${file.name} (${file.id})`);
    return file.id;
  }

  console.log(`[TRACE:drive:search] No transcript doc found for meetingCode=${meetingCode}`);
  return null;
}

/**
 * Export a Google Doc as plain text.
 * For Meet-generated transcript documents (Google Docs format, not binary files).
 * Uses files.export (not alt=media which is for binary downloads).
 */
export async function exportGoogleDoc(docId: string): Promise<string> {
  const token = await getValidGoogleToken();

  const start = Date.now();
  const res = await fetch(
    `${DRIVE_API}/${docId}/export?mimeType=text/plain`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  traceGoogleApi("drive", "GET files.export", res.status, Date.now() - start, {
    docId,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Google Doc export failed for ${docId}: ${res.status} ${sanitizeErrorBody(body)}`,
    );
  }

  const text = await res.text();
  console.log(`[TRACE:drive:export] docId=${docId} chars=${text.length}`);
  return text;
}
