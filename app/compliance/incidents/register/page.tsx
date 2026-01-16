"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, AlertTriangle, Filter, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Incident {
  id: string;
  incidentType: string;
  description: string;
  occurredAt: string;
  reportedAt: string;
  status: string;
  ndisReported: boolean;
  participant?: {
    id: string;
    name: string;
    email: string;
  };
  worker?: {
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export default function IncidentRegisterPage() {
  const { data: session } = useSession();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    incidentType: "",
    status: "",
    search: "",
  });

  useEffect(() => {
    fetchIncidents();
  }, [filters]);

  const fetchIncidents = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.incidentType) params.append("incidentType", filters.incidentType);
      if (filters.status) params.append("status", filters.status);

      const response = await fetch(
        `/api/compliance/incidents?${params.toString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setIncidents(data.incidents || []);
      }
    } catch (error) {
      console.error("Error fetching incidents:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      SERIOUS_INCIDENT: "bg-red-100 text-red-800",
      REPORTABLE_INCIDENT: "bg-orange-100 text-orange-800",
      NEAR_MISS: "bg-yellow-100 text-yellow-800",
      MINOR_INCIDENT: "bg-blue-100 text-blue-800",
      OTHER: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge className={colors[type] || "bg-gray-100 text-gray-800"}>
        {type.replace(/_/g, " ")}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      REPORTED: "secondary",
      UNDER_INVESTIGATION: "default",
      RESOLVED: "default",
      CLOSED: "outline",
      NDIS_REPORTED: "default",
    };

    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Incident Register</h1>
          <p className="text-muted-foreground">
            Track and manage incidents with NDIS reporting
          </p>
        </div>
        <Button asChild>
          <Link href="/compliance/incidents/create">
            <Plus className="h-4 w-4 mr-2" />
            Report Incident
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
                placeholder="Search incidents..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <select
              value={filters.incidentType}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, incidentType: e.target.value }))
              }
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Types</option>
              <option value="SERIOUS_INCIDENT">Serious Incident</option>
              <option value="REPORTABLE_INCIDENT">Reportable Incident</option>
              <option value="NEAR_MISS">Near Miss</option>
              <option value="MINOR_INCIDENT">Minor Incident</option>
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
              <option value="REPORTED">Reported</option>
              <option value="UNDER_INVESTIGATION">Under Investigation</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="NDIS_REPORTED">NDIS Reported</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Incidents List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading incidents...</p>
        </div>
      ) : incidents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No incidents found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <Card key={incident.id} variant="interactive">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <CardTitle className="text-lg">
                        {incident.incidentType.replace(/_/g, " ")}
                      </CardTitle>
                      {getTypeBadge(incident.incidentType)}
                      {getStatusBadge(incident.status)}
                      {incident.ndisReported && (
                        <Badge variant="default">NDIS Reported</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {incident.description.substring(0, 200)}
                      {incident.description.length > 200 ? "..." : ""}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Occurred: {new Date(incident.occurredAt).toLocaleString()}
                      </span>
                      <span>
                        Reported: {new Date(incident.reportedAt).toLocaleString()}
                      </span>
                      {incident.participant && (
                        <span>Participant: {incident.participant.name}</span>
                      )}
                      {incident.worker && (
                        <span>Worker: {incident.worker.user.name}</span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/compliance/incidents/${incident.id}`}>
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
