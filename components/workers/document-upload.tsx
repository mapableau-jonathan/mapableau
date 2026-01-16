"use client";

import { useState, useCallback } from "react";
import { Upload, X, File } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentUploadProps {
  documentType: string;
  label: string;
  description?: string;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  onUpload: (file: File) => Promise<string>; // Returns file URL
  onRemove?: () => void;
  currentFileUrl?: string;
  disabled?: boolean;
}

export function DocumentUpload({
  documentType,
  label,
  description,
  acceptedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"],
  maxSizeMB = 5,
  onUpload,
  onRemove,
  currentFileUrl,
  disabled = false,
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentFileUrl || null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);

      // Validate file type
      if (!acceptedTypes.includes(file.type)) {
        setError(
          `Invalid file type. Accepted types: ${acceptedTypes.join(", ")}`
        );
        return;
      }

      // Validate file size
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        setError(`File size exceeds ${maxSizeMB}MB limit`);
        return;
      }

      setUploading(true);

      try {
        const fileUrl = await onUpload(file);
        setPreview(fileUrl);

        // Create preview for images
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setPreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to upload file"
        );
      } finally {
        setUploading(false);
      }
    },
    [acceptedTypes, maxSizeMB, onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    setError(null);
    if (onRemove) {
      onRemove();
    }
  }, [onRemove]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {preview ? (
        <div className="relative border rounded-lg p-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <File className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">
                {preview.includes("data:") ? "Preview" : "File uploaded"}
              </span>
            </div>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {preview.startsWith("data:image") && (
            <img
              src={preview}
              alt="Preview"
              className="mt-2 max-h-48 rounded object-contain"
            />
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center
            transition-colors
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary"}
          `}
        >
          <input
            type="file"
            id={`file-${documentType}`}
            accept={acceptedTypes.join(",")}
            onChange={handleFileInput}
            disabled={disabled || uploading}
            className="hidden"
          />
          <label
            htmlFor={`file-${documentType}`}
            className="cursor-pointer"
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">
              {uploading ? "Uploading..." : "Click to upload or drag and drop"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {acceptedTypes.join(", ")} (max {maxSizeMB}MB)
            </p>
          </label>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
