/**
 * Admin Worker Verification Page
 * Allows admins to verify workers
 */

"use client";

import { useState, useEffect } from "react";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, User, Shield, Clock } from "lucide-react";

interface PendingWorker {
  id: string;
  user: {
    name: string | null;
    email: string;
    image: string | null;
  };
  role: string | null;
  status: string;
  verifications: Array<{
    id: string;
    verificationType: string;
    status: string;
    createdAt: Date;
  }>;
  adminVerification?: {
    status: string;
    notes?: string;
    verifiedAt: Date;
  };
}

export default function AdminVerifyWorkersPage() {
  const { isAuthenticated, user, loading: authLoading } = useAuthGuard({
    redirectTo: "/login",
    requiredRoles: ["NDIA_ADMIN"],
  });

  const [workers, setWorkers] = useState<PendingWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPendingWorkers();
    }
  }, [isAuthenticated]);

  const fetchPendingWorkers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/workers/pending");
      
      if (!response.ok) {
        throw new Error("Failed to fetch workers");
      }

      const data = await response.json();
      setWorkers(data.workers || []);
    } catch (error) {
      console.error("Error fetching workers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (workerId: string, status: "approved" | "rejected") => {
    try {
      setVerifying(true);
      const response = await fetch(`/api/admin/workers/${workerId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to verify worker");
      }

      await fetchPendingWorkers();
      setSelectedWorker(null);
      setNotes("");
    } catch (error) {
      console.error("Error verifying worker:", error);
      alert("Failed to verify worker");
    } finally {
      setVerifying(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8" role="status" aria-live="polite">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" id="page-title">
          Verify Workers
        </h1>
        <p className="text-muted-foreground">
          Review and verify worker credentials
        </p>
      </div>

      {workers.length === 0 ? (
        <Card role="status">
          <CardContent className="py-12 text-center">
            <p>No pending workers to verify.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4" role="list" aria-label="Pending workers">
          {workers.map((worker) => (
            <Card key={worker.id} role="listitem">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {worker.user.image ? (
                      <img
                        src={worker.user.image}
                        alt={worker.user.name || "Worker profile"}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-xl">
                        {worker.user.name || "Unknown"}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{worker.user.email}</p>
                      {worker.role && (
                        <p className="text-sm text-muted-foreground">{worker.role}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {worker.adminVerification ? (
                      <Badge
                        variant={worker.adminVerification.status === "approved" ? "default" : "destructive"}
                      >
                        {worker.adminVerification.status === "approved" ? "Approved" : "Rejected"}
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" aria-hidden="true" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Verifications:</h3>
                    <div className="flex flex-wrap gap-2">
                      {worker.verifications.map((v) => (
                        <Badge
                          key={v.id}
                          variant={v.status === "VERIFIED" ? "default" : "outline"}
                        >
                          {v.verificationType}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {selectedWorker === worker.id && (
                    <div className="border-t pt-4 space-y-4">
                      <div>
                        <label htmlFor={`notes-${worker.id}`} className="block text-sm font-medium mb-2">
                          Notes (optional)
                        </label>
                        <Textarea
                          id={`notes-${worker.id}`}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add notes about this verification..."
                          rows={3}
                          aria-label="Verification notes"
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleVerify(worker.id, "approved")}
                          disabled={verifying}
                          className="flex-1"
                          aria-label={`Approve ${worker.user.name || "worker"}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleVerify(worker.id, "rejected")}
                          disabled={verifying}
                          variant="destructive"
                          className="flex-1"
                          aria-label={`Reject ${worker.user.name || "worker"}`}
                        >
                          <XCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                          Reject
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedWorker(null);
                            setNotes("");
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {!selectedWorker && (
                    <Button
                      onClick={() => setSelectedWorker(worker.id)}
                      variant="outline"
                      className="w-full"
                      aria-label={`Verify ${worker.user.name || "worker"}`}
                    >
                      <Shield className="w-4 h-4 mr-2" aria-hidden="true" />
                      Verify Worker
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
