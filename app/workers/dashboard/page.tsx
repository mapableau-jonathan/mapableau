"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { VerificationStatusCard } from "@/components/workers/verification-status";
import { AlertService } from "@/lib/services/alerts/alert-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface Verification {
  id: string;
  type: string;
  status: string;
  expiresAt?: string | null;
  verifiedAt?: string | null;
  errorMessage?: string | null;
}

export default function WorkerDashboardPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const workerId = searchParams.get("workerId");

  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id && !workerId) {
      setError("Worker ID is required");
      setLoading(false);
      return;
    }

    fetchVerifications();
    fetchAlerts();
  }, [session, workerId]);

  const fetchVerifications = async () => {
    try {
      // If workerId is provided, use it; otherwise find worker by userId
      let targetWorkerId = workerId;

      if (!targetWorkerId && session?.user?.id) {
        // Find worker by userId
        const workerResponse = await fetch(
          `/api/workers?userId=${session.user.id}`
        );
        if (workerResponse.ok) {
          const workerData = await workerResponse.json();
          targetWorkerId = workerData.id;
        }
      }

      if (!targetWorkerId) {
        setError("Worker not found");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `/api/workers/${targetWorkerId}/verifications`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch verifications");
      }

      const data = await response.json();
      setVerifications(data.verifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load verifications");
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      // This would fetch alerts for the worker
      // For now, we'll get them from the verifications response
    } catch (err) {
      console.error("Error fetching alerts:", err);
    }
  };

  const handleRecheck = async (verificationId: string, type: string) => {
    try {
      const workerId = searchParams.get("workerId");
      if (!workerId) return;

      const response = await fetch(
        `/api/workers/${workerId}/verifications/${type}/status`,
        { method: "GET" }
      );

      if (response.ok) {
        await fetchVerifications();
      }
    } catch (err) {
      console.error("Error rechecking:", err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const allVerified = verifications.every((v) => v.status === "VERIFIED");
  const anyExpired = verifications.some(
    (v) => v.status === "EXPIRED" || v.status === "FAILED"
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Worker Verification Dashboard</h1>
        <div className="flex items-center gap-2">
          {allVerified ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <Badge variant="default">All Verified</Badge>
            </>
          ) : anyExpired ? (
            <>
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <Badge variant="destructive">Action Required</Badge>
            </>
          ) : (
            <Badge variant="secondary">In Progress</Badge>
          )}
        </div>
      </div>

      {alerts.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {alerts.map((alert) => (
                <li key={alert.id} className="text-sm">
                  {alert.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {verifications.map((verification) => (
          <VerificationStatusCard
            key={verification.id}
            type={verification.type}
            status={verification.status as any}
            expiresAt={
              verification.expiresAt ? new Date(verification.expiresAt) : undefined
            }
            verifiedAt={
              verification.verifiedAt
                ? new Date(verification.verifiedAt)
                : undefined
            }
            errorMessage={verification.errorMessage || undefined}
            onRecheck={() => handleRecheck(verification.id, verification.type)}
          />
        ))}
      </div>

      {verifications.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No verifications found. Please complete the onboarding process.</p>
            <a
              href="/workers/onboard"
              className="text-primary hover:underline mt-2 inline-block"
            >
              Start Onboarding
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
