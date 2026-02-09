# Amazon S3 & Google Cloud Storage

AccessiBooks uses `@aws-sdk/client-s3` and `@google-cloud/storage` for object storage. Use `lib/s3.ts` and `lib/gcs.ts` in API routes or server code.

## Amazon S3

### Environment variables

```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-southeast-2
S3_BUCKET=your-bucket-name
```

Optional: `AWS_SESSION_TOKEN` for temporary credentials.

### Usage

```ts
import { s3Upload, s3Get, s3List, s3Delete, s3Configured } from "@/lib/s3";

// Upload
await s3Upload("path/to/file.txt", Buffer.from("hello"), "text/plain");

// Download
const buf = await s3Get("path/to/file.txt");

// List
const keys = await s3List("path/prefix/");

// Delete
await s3Delete("path/to/file.txt");

// Check config
if (s3Configured()) { /* ... */ }
```

## Google Cloud Storage

### Environment variables

```bash
GCS_BUCKET=your-bucket-name
GCP_PROJECT=your-project-id

# Auth: path to service account JSON key
GOOGLE_APPLICATION_CREDENTIALS=./keys/gcp-service-account.json
```

Without `GOOGLE_APPLICATION_CREDENTIALS`, the client uses Application Default Credentials (ADC).

### Usage

```ts
import { gcsUpload, gcsGet, gcsList, gcsDelete, gcsConfigured } from "@/lib/gcs";

// Upload
await gcsUpload("path/to/file.txt", Buffer.from("hello"), "text/plain");

// Download
const buf = await gcsGet("path/to/file.txt");

// List
const names = await gcsList("path/prefix/");

// Delete
await gcsDelete("path/to/file.txt");

// Check config
if (gcsConfigured()) { /* ... */ }
```

## Security

- Never commit credentials. Use `.env.local` or Vercel environment variables.
- Restrict IAM / service account permissions to the minimum required (read/write only on the target bucket).
- Prefer signed URLs or CDN for public access; avoid exposing keys in client code.
