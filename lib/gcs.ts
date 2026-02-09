/**
 * Google Cloud Storage client. Uses @google-cloud/storage.
 * Set GCS_BUCKET in env. Auth via GOOGLE_APPLICATION_CREDENTIALS (path to JSON key) or ADC.
 */

import { Storage } from "@google-cloud/storage";

const bucketName = process.env.GCS_BUCKET ?? "";

const storage = bucketName
  ? new Storage({
      projectId: process.env.GCP_PROJECT ?? undefined,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS ?? undefined,
    })
  : null;

function bucket() {
  return storage?.bucket(bucketName) ?? null;
}

/** Upload a buffer or string to GCS. */
export async function gcsUpload(
  key: string,
  body: Buffer | string,
  contentType?: string,
): Promise<string | null> {
  const b = bucket();
  if (!b) return null;
  const file = b.file(key);
  await file.save(body, {
    contentType,
    metadata: { cacheControl: "public, max-age=3600" },
  });
  return key;
}

/** Get object contents as Buffer. */
export async function gcsGet(key: string): Promise<Buffer | null> {
  const b = bucket();
  if (!b) return null;
  const file = b.file(key);
  const [buf] = await file.download();
  return buf ?? null;
}

/** List object names with optional prefix. */
export async function gcsList(
  prefix = "",
  maxResults = 1000,
): Promise<string[]> {
  const b = bucket();
  if (!b) return [];
  const [files] = await b.getFiles({ prefix: prefix || undefined, maxResults });
  return files.map((f) => f.name);
}

/** Delete an object. */
export async function gcsDelete(key: string): Promise<boolean> {
  const b = bucket();
  if (!b) return false;
  const file = b.file(key);
  await file.delete();
  return true;
}

/** Whether GCS is configured and usable. */
export function gcsConfigured(): boolean {
  return Boolean(storage && bucketName);
}
