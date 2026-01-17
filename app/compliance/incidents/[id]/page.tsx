"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  Calendar,
  MapPin,
  User,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Incident {
  id: string;
  incidentType: string;
  description: string;
  occurredAt: string;
  reportedAt: string;
  status: string;
  location?: string;
  ndisReported: boolean;
  ndisReportNumber?: string;
  ndisReportedAt?: string;
  actionsTaken?: Array<{
    action: string;
    takenBy: string;
    takenAt: string;
  }>;
  resolution?: string;
  resolvedAt?: string;
  resolvedBy?: string;
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

export default function IncidentDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [reportingToNDIS, setReportingToNDIS] = useState(false);
  const [ndisReportNumber, setNdisReportNumber] = useState("");

  useEffect(() => {
    if (params.id) {
      fetchIncident();
    }
  }, [params.id]);

  const fetchIncident = async () => {
    try {
      const response = await fetch(`/api/compliance/incidents/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setIncident(data);
        if (data.ndisReportNumber) {
          setNdisReportNumber(data.ndisReportNumber);
        }
      }
    } catch (error) {
      console.error("Error fetching incident:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!incident) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/compliance/incidents/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === "RESOLVED" || newStatus === "CLOSED"
            ? { resolvedBy: session?.user?.id }
            : {}),
        }),
      });

      if (response.ok) {
        await fetchIncident();
      }
    } catch (error) {
      console.error("Error updating incident:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleNDISReport = async () => {
    if (!ndisReportNumber.trim()) {
      alert("Please enter an NDIS report number");
      return;
    }

    setReportingToNDIS(true);
    try {
      const response = await fetch(
        `/api/compliance/incidents/${params.id}/ndis-report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportNumber: ndisReportNumber }),
        }
      );

      if (response.ok) {
        await fetchIncident();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to report to NDIS");
      }
    } catch (error) {
      console.error("Error reporting to NDIS:", error);
      alert("Failed to report to NDIS");
    } finally {
      setReportingToNDIS(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Incident not found</p>
      </div>
    );
  }

  const isSeriousOrReportable =
    incident.incidentType === "SERIOUS_INCIDENT" ||
    incident.incidentType === "REPORTABLE_INCIDENT";
  const requiresNDISReport = isSeriousOrReportable && !incident.ndisReported;

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
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      REPORTED: "secondary",
      UNDER_INVESTIGATION: "default",
      RESOLVED: "default",
      CLOSED: "outline",
      NDIS_REPORTED: "default",
    };

    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle className="text-2xl">
                  {incident.incidentType.replace(/_/g, " ")}
                </CardTitle>
                {getTypeBadge(incident.incidentType)}
                {getStatusBadge(incident.status)}
                {incident.ndisReported && (
                  <Badge variant="default">NDIS Reported</Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Incident Details */}
            <div>
              <h3 className="font-semibold mb-3">Incident Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Occurred:</span>
                  <span>
                    {new Date(incident.occurredAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Reported:</span>
                  <span>
                    {new Date(incident.reportedAt).toLocaleString()}
                  </span>
                </div>
                {incident.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Location:</span>
                    <span>{incident.location}</span>
                  </div>
                )}
                {incident.participant && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Participant:</span>
                    <span>{incident.participant.name || incident.participant.email}</span>
                  </div>
                )}
                {incident.worker && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Worker:</span>
                    <span>
                      {incident.worker.user.name || incident.worker.user.email}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded">
                {incident.description}
              </p>
            </div>

            {/* NDIS Reporting */}
            {requiresNDISReport && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-900">
                    NDIS Reporting Required
                  </h3>
                </div>
                <p className="text-sm text-yellow-800 mb-3">
                  This incident must be reported to the NDIS Commission within 24
                  hours.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ndisReportNumber}
                    onChange={(e) => setNdisReportNumber(e.target.value)}
                    placeholder="Enter NDIS Report Number"
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                  <Button
                    onClick={handleNDISReport}
                    disabled={reportingToNDIS}
                    size="sm"
                  >
                    {reportingToNDIS ? "Reporting..." : "Report to NDIS"}
                  </Button>
                </div>
              </div>
            )}

            {incident.ndisReported && incident.ndisReportNumber && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">
                      Reported to NDIS Commission
                    </p>
                    <p className="text-sm text-green-800">
                      Report Number: {incident.ndisReportNumber}
                    </p>
                    {incident.ndisReportedAt && (
                      <p className="text-xs text-green-700">
                        Reported on:{" "}
                        {new Date(incident.ndisReportedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions Taken */}
            {incident.actionsTaken && incident.actionsTaken.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Actions Taken</h3>
                <div className="space-y-2">
                  {incident.actionsTaken.map((action, idx) => (
                    <div
                      key={idx}
                      className="bg-muted p-3 rounded text-sm"
                    >
                      <p className="font-medium">{action.action}</p>
                      <p className="text-xs text-muted-foreground">
                        By: {action.takenBy} •{" "}
                        {new Date(action.takenAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution */}
            {incident.resolution && (
              <div>
                <h3 className="font-semibold mb-2">Resolution</h3>
                <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded">
                  {incident.resolution}
                </p>
                {incident.resolvedAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Resolved on: {new Date(incident.resolvedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Status Actions */}
            <div className="flex gap-2 pt-4 border-t">
              {incident.status === "REPORTED" && (
                <Button
                  onClick={() => handleStatusUpdate("UNDER_INVESTIGATION")}
                  disabled={updating}
                  variant="outline"
                >
                  Mark Under Investigation
                </Button>
              )}
              {incident.status === "UNDER_INVESTIGATION" && (
                <>
                  <Button
                    onClick={() => handleStatusUpdate("RESOLVED")}
                    disabled={updating}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Resolved
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate("CLOSED")}
                    disabled={updating}
                    variant="outline"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Close Incident
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
