"use client";

import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { VerificationStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";

interface VerificationStatusProps {
  type: string;
  status: VerificationStatus;
  expiresAt?: Date | null;
  verifiedAt?: Date | null;
  errorMessage?: string | null;
  onRecheck?: () => void;
}

const statusConfig: Record<
  VerificationStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }
> = {
  PENDING: {
    label: "Pending",
    variant: "outline",
    icon: Clock,
  },
  IN_PROGRESS: {
    label: "In Progress",
    variant: "secondary",
    icon: Clock,
  },
  VERIFIED: {
    label: "Verified",
    variant: "default",
    icon: CheckCircle2,
  },
  FAILED: {
    label: "Failed",
    variant: "destructive",
    icon: XCircle,
  },
  EXPIRED: {
    label: "Expired",
    variant: "destructive",
    icon: AlertTriangle,
  },
  SUSPENDED: {
    label: "Suspended",
    variant: "destructive",
    icon: XCircle,
  },
};

export function VerificationStatusCard({
  type,
  status,
  expiresAt,
  verifiedAt,
  errorMessage,
  onRecheck,
}: VerificationStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const getTypeLabel = (verificationType: string) => {
    const labels: Record<string, string> = {
      IDENTITY: "Identity Verification",
      VEVO: "Work Rights (VEVO)",
      WWCC: "Working with Children Check",
      NDIS: "NDIS Worker Screening",
      FIRST_AID: "First Aid Certificate",
    };
    return labels[verificationType] || verificationType;
  };

  const isExpiringSoon =
    expiresAt && new Date(expiresAt) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon
            className={`h-5 w-5 ${
              status === "VERIFIED"
                ? "text-green-600"
                : status === "FAILED" || status === "EXPIRED"
                ? "text-red-600"
                : "text-muted-foreground"
            }`}
          />
          <h3 className="font-semibold">{getTypeLabel(type)}</h3>
        </div>
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>

      {verifiedAt && (
        <p className="text-sm text-muted-foreground">
          Verified {formatDistanceToNow(new Date(verifiedAt), { addSuffix: true })}
        </p>
      )}

      {expiresAt && (
        <div>
          <p className="text-sm text-muted-foreground">
            Expires: {new Date(expiresAt).toLocaleDateString()}
          </p>
          {isExpiringSoon && (
            <p className="text-sm text-amber-600 mt-1">
              Expiring in {formatDistanceToNow(new Date(expiresAt), { addSuffix: true })}
            </p>
          )}
        </div>
      )}

      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      {onRecheck && (status === "FAILED" || status === "EXPIRED") && (
        <button
          onClick={onRecheck}
          className="text-sm text-primary hover:underline"
        >
          Re-verify
        </button>
      )}
    </div>
  );
}
