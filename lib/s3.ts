/**
 * Amazon S3 client. Uses @aws-sdk/client-s3.
 * Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and S3_BUCKET in env.
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION ?? "ap-southeast-2";
const bucket = process.env.S3_BUCKET ?? "";

const s3Client =
  bucket
    ? new S3Client({
        region,
        credentials:
          process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
            ? {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                sessionToken: process.env.AWS_SESSION_TOKEN ?? undefined,
              }
            : undefined, // Falls back to default credential chain
      })
    : null;

/** Upload a buffer or string to S3. */
export async function s3Upload(
  key: string,
  body: Buffer | string,
  contentType?: string,
): Promise<string | null> {
  if (!s3Client || !bucket) return null;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

/** Get object contents as Buffer. */
export async function s3Get(key: string): Promise<Buffer | null> {
  if (!s3Client || !bucket) return null;
  const res = await s3Client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (!res.Body) return null;
  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>)
    chunks.push(chunk);
  return Buffer.concat(chunks);
}

/** List object keys with optional prefix. */
export async function s3List(
  prefix = "",
  maxKeys = 1000,
): Promise<string[]> {
  if (!s3Client || !bucket) return [];
  const res = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix || undefined,
      MaxKeys: maxKeys,
    }),
  );
  return (res.Contents ?? []).map((o) => o.Key!).filter(Boolean);
}

/** Delete an object. */
export async function s3Delete(key: string): Promise<boolean> {
  if (!s3Client || !bucket) return false;
  await s3Client.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key }),
  );
  return true;
}

/** Whether S3 is configured and usable. */
export function s3Configured(): boolean {
  return Boolean(s3Client && bucket);
}
