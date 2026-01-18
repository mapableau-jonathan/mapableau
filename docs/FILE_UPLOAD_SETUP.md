# File Upload Setup

## Overview

File upload functionality has been implemented using Next.js App Router's native FormData handling. **Multer is installed but not required** for Next.js App Router routes (it's available if needed for Express-style middleware).

## Implementation

### Upload Endpoint

**Location**: `app/api/upload/route.ts`

- **Method**: POST
- **Authentication**: Required (NextAuth session)
- **Max File Size**: 10MB
- **Allowed Types**: 
  - Images: JPEG, PNG, GIF, WebP
  - Documents: PDF, DOC, DOCX

### Usage

```typescript
const formData = new FormData();
formData.append("file", file);

const response = await fetch("/api/upload", {
  method: "POST",
  body: formData,
});

const data = await response.json();
// Returns: { success: true, fileUrl, fileName, fileSize, fileType }
```

### File Storage

- **Location**: `public/uploads/`
- **Naming**: `{userId}-{timestamp}.{extension}`
- **Access**: Files are publicly accessible at `/uploads/{filename}`

## Configuration

### Next.js Config

File size limit is configured in `next.config.ts`:

```typescript
experimental: {
  serverActions: {
    bodySizeLimit: '10mb',
  },
}
```

### Runtime Configuration

The upload route uses Node.js runtime (required for filesystem operations):

```typescript
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
```

## Security

1. **Authentication**: All uploads require a valid NextAuth session
2. **File Type Validation**: Only allowed MIME types are accepted
3. **File Size Limits**: 10MB maximum per file
4. **Unique Filenames**: Prevents overwriting with timestamp-based naming

## Production Considerations

For production, consider:

1. **Cloud Storage**: Use S3, Azure Blob, or similar instead of local filesystem
2. **CDN**: Serve uploaded files through a CDN
3. **Virus Scanning**: Implement virus scanning for uploaded files
4. **Access Control**: Implement proper access control for sensitive documents
5. **Backup**: Ensure uploaded files are backed up

## Multer

Multer (`multer@2.0.2`) is installed but **not used** in the current implementation. It's available if you need it for:

- Express.js middleware
- Custom file processing
- Legacy code compatibility

Next.js App Router handles FormData natively, so Multer is not required for App Router routes.

## Troubleshooting

### "File too large" error
- Check `next.config.ts` bodySizeLimit setting
- Verify file is under 10MB

### "File type not allowed"
- Check the `ALLOWED_TYPES` array in `app/api/upload/route.ts`
- Ensure file MIME type matches allowed types

### "Unauthorized" error
- Ensure user is logged in with NextAuth
- Check session is valid

### Files not accessible
- Ensure `public/uploads/` directory exists
- Check file permissions
- Verify file was saved correctly
