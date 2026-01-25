/**
 * Public Worker Directory
 * Displays verified workers (publicly accessible)
 * Never exposes sensitive verification evidence
 */

"use client";

import { useState, useEffect } from "react";
// Public worker directory - no sensitive data exposed
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, Shield, CheckCircle } from "lucide-react";

interface WorkerProfile {
  id: string;
  user: {
    name: string | null;
    image: string | null;
  };
  role: string | null;
  status: string;
  verifications: Array<{
    verificationType: string;
    status: string;
    verifiedAt: Date | null;
  }>;
}

export default function WorkersDirectoryPage() {
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<WorkerProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkers();
  }, []);

  useEffect(() => {
    // Filter workers by search query
    if (!searchQuery.trim()) {
      setFilteredWorkers(workers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = workers.filter(
      (worker) =>
        worker.user.name?.toLowerCase().includes(query) ||
        worker.role?.toLowerCase().includes(query)
    );
    setFilteredWorkers(filtered);
  }, [searchQuery, workers]);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/workers/public");
      
      if (!response.ok) {
        throw new Error("Failed to fetch workers");
      }

      const data = await response.json();
      // Only show verified workers
      const verifiedWorkers = data.workers.filter(
        (w: WorkerProfile) => w.status === "VERIFIED"
      );
      setWorkers(verifiedWorkers);
      setFilteredWorkers(verifiedWorkers);
    } catch (error) {
      console.error("Error fetching workers:", error);
    } finally {
      setLoading(false);
    }
  };

  const getVerificationBadge = (verification: { verificationType: string; status: string }) => {
    if (verification.status !== "VERIFIED") return null;

    const labels: Record<string, string> = {
      IDENTITY: "Identity Verified",
      WWCC: "WWCC",
      NDIS: "NDIS Check",
      FIRST_AID: "First Aid",
    };

    return (
      <Badge key={verification.verificationType} variant="secondary" className="mr-1">
        {labels[verification.verificationType] || verification.verificationType}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" id="page-title">
          Worker Directory
        </h1>
        <p className="text-muted-foreground">
          Browse verified disability support workers
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6" role="search" aria-label="Search workers">
        <div className="relative max-w-md">
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
            aria-hidden="true"
          />
          <Input
            type="text"
            placeholder="Search by name or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            aria-label="Search workers"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12" role="status" aria-live="polite">
          <p>Loading workers...</p>
        </div>
      )}

      {/* Workers Grid */}
      {!loading && filteredWorkers.length === 0 && (
        <div className="text-center py-12" role="status">
          <p>No verified workers found.</p>
        </div>
      )}

      {!loading && filteredWorkers.length > 0 && (
        <div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          role="list"
          aria-label="List of verified workers"
        >
          {filteredWorkers.map((worker) => (
            <Card 
              key={worker.id}
              className="hover:shadow-lg transition-shadow"
              role="listitem"
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="relative">
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
                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                      <CheckCircle className="w-4 h-4 text-white" aria-label="Verified" />
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-xl">{worker.user.name || "Unknown"}</CardTitle>
                    {worker.role && (
                      <p className="text-sm text-muted-foreground">{worker.role}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Verifications:</p>
                    <div className="flex flex-wrap gap-1">
                      {worker.verifications
                        .filter((v) => v.status === "VERIFIED")
                        .map((v) => getVerificationBadge(v))}
                      {worker.verifications.filter((v) => v.status === "VERIFIED").length === 0 && (
                        <span className="text-sm text-muted-foreground">No verifications shown</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
