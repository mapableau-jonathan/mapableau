"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, MessageSquare, Filter, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Complaint {
  id: string;
  complaintNumber: string;
  source: string;
  description: string;
  status: string;
  receivedAt: string;
  serviceArea?: string | null;
  participant?: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    resolutions: number;
  };
}

export default function ComplaintsRegisterPage() {
  const { data: session } = useSession();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    source: "",
    status: "",
    search: "",
  });

  useEffect(() => {
    fetchComplaints();
  }, [filters]);

  const fetchComplaints = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.source) params.append("source", filters.source);
      if (filters.status) params.append("status", filters.status);

      const response = await fetch(
        `/api/compliance/complaints?${params.toString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setComplaints(data.complaints || []);
      }
    } catch (error) {
      console.error("Error fetching complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      PARTICIPANT: "bg-blue-100 text-blue-800",
      FAMILY: "bg-purple-100 text-purple-800",
      WORKER: "bg-green-100 text-green-800",
      ANONYMOUS: "bg-gray-100 text-gray-800",
      OTHER: "bg-orange-100 text-orange-800",
    };

    return (
      <Badge className={colors[source] || "bg-gray-100 text-gray-800"}>
        {source}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      RECEIVED: "secondary",
      ACKNOWLEDGED: "default",
      UNDER_INVESTIGATION: "default",
      RESOLVED: "default",
      CLOSED: "outline",
      ESCALATED: "destructive",
    };

    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Complaints Register</h1>
          <p className="text-muted-foreground">
            Track and manage complaints with resolution workflow
          </p>
        </div>
        <Button asChild>
          <Link href="/compliance/complaints/create">
            <Plus className="h-4 w-4 mr-2" />
            New Complaint
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search complaints..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <select
              value={filters.source}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, source: e.target.value }))
              }
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Sources</option>
              <option value="PARTICIPANT">Participant</option>
              <option value="FAMILY">Family</option>
              <option value="WORKER">Worker</option>
              <option value="ANONYMOUS">Anonymous</option>
              <option value="OTHER">Other</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Statuses</option>
              <option value="RECEIVED">Received</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="UNDER_INVESTIGATION">Under Investigation</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="ESCALATED">Escalated</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Complaints List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading complaints...</p>
        </div>
      ) : complaints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No complaints found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => (
            <Card key={complaint.id} variant="interactive">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">
                        {complaint.complaintNumber}
                      </CardTitle>
                      {getSourceBadge(complaint.source)}
                      {getStatusBadge(complaint.status)}
                      {complaint.serviceArea && (
                        <Badge variant="outline">{complaint.serviceArea}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {complaint.description.substring(0, 200)}
                      {complaint.description.length > 200 ? "..." : ""}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Received: {new Date(complaint.receivedAt).toLocaleString()}
                      </span>
                      {complaint.participant && (
                        <span>Participant: {complaint.participant.name}</span>
                      )}
                      <span>
                        {complaint._count.resolutions} resolution
                        {complaint._count.resolutions !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/compliance/complaints/${complaint.id}`}>
                      View
                    </Link>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
