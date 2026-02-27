import { getValidGoogleToken } from "@/lib/google/client";

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

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Drive API error: ${response.status} ${message}`);
  }

  return (await response.json()) as DriveFileMetadata;
}

/**
 * Download file content from Google Drive as raw text.
 * Uses the `alt=media` parameter to retrieve file bytes.
 */
export async function downloadDriveFile(fileId: string): Promise<string> {
  const token = await getValidGoogleToken();

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Drive API error: ${response.status} ${message}`);
  }

  return response.text();
}
