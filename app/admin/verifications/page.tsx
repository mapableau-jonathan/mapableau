"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { VerificationStatusCard } from "@/components/workers/verification-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download } from "lucide-react";

interface WorkerVerification {
  workerId: string;
  workerName: string;
  workerEmail: string;
  verifications: Array<{
    id: string;
    type: string;
    status: string;
    expiresAt?: string | null;
    verifiedAt?: string | null;
  }>;
}

export default function AdminVerificationsPage() {
  const { data: session } = useSession();
  const [workers, setWorkers] = useState<WorkerVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      // In a real implementation, this would fetch all workers with verifications
      // For now, we'll create a placeholder
      const response = await fetch("/api/admin/verifications");
      if (response.ok) {
        const data = await response.json();
        setWorkers(data.workers || []);
      }
    } catch (err) {
      console.error("Error fetching workers:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkers = workers.filter((worker) => {
    const matchesSearch =
      worker.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.workerEmail.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === "all") {
      return matchesSearch;
    }

    const hasMatchingStatus = worker.verifications.some(
      (v) => v.status === statusFilter
    );

    return matchesSearch && hasMatchingStatus;
  });

  const exportReport = async () => {
    try {
      const response = await fetch("/api/admin/verifications/report", {
        method: "GET",
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `verifications-report-${new Date().toISOString()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Error exporting report:", err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Worker Verifications</h1>
          <p className="text-muted-foreground">
            Manage and monitor all worker verifications
          </p>
        </div>
        <Button onClick={exportReport}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search workers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded"
            >
              <option value="all">All Statuses</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="EXPIRED">Expired</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {filteredWorkers.map((worker) => (
          <Card key={worker.workerId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{worker.workerName}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {worker.workerEmail}
                  </p>
                </div>
                <Badge
                  variant={
                    worker.verifications.every((v) => v.status === "VERIFIED")
                      ? "default"
                      : "secondary"
                  }
                >
                  {worker.verifications.filter((v) => v.status === "VERIFIED")
                    .length}{" "}
                  / {worker.verifications.length} Verified
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {worker.verifications.map((verification) => (
                  <VerificationStatusCard
                    key={verification.id}
                    type={verification.type}
                    status={verification.status as any}
                    expiresAt={
                      verification.expiresAt
                        ? new Date(verification.expiresAt)
                        : undefined
                    }
                    verifiedAt={
                      verification.verifiedAt
                        ? new Date(verification.verifiedAt)
                        : undefined
                    }
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredWorkers.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>No workers found matching your criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
