"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  MessageSquare,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Complaint {
  id: string;
  complaintNumber: string;
  source: string;
  description: string;
  status: string;
  receivedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  serviceArea?: string;
  resolution?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  satisfactionRating?: number;
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
  resolutions: Array<{
    id: string;
    action: string;
    takenBy: string;
    takenAt: string;
    outcome?: string;
  }>;
}

export default function ComplaintDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolution, setResolution] = useState("");
  const [satisfactionRating, setSatisfactionRating] = useState(0);

  useEffect(() => {
    if (params.id) {
      fetchComplaint();
    }
  }, [params.id]);

  const fetchComplaint = async () => {
    try {
      const response = await fetch(`/api/compliance/complaints/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setComplaint(data);
        if (data.resolution) {
          setResolution(data.resolution);
        }
        if (data.satisfactionRating) {
          setSatisfactionRating(data.satisfactionRating);
        }
      }
    } catch (error) {
      console.error("Error fetching complaint:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!complaint) return;

    setUpdating(true);
    try {
      const response = await fetch(
        `/api/compliance/complaints/${params.id}/acknowledge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.ok) {
        await fetchComplaint();
      }
    } catch (error) {
      console.error("Error acknowledging complaint:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleResolve = async () => {
    if (!complaint || !resolution.trim()) {
      alert("Please enter a resolution");
      return;
    }

    setResolving(true);
    try {
      const response = await fetch(
        `/api/compliance/complaints/${params.id}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resolution,
            satisfactionRating: satisfactionRating > 0 ? satisfactionRating : undefined,
          }),
        }
      );

      if (response.ok) {
        await fetchComplaint();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to resolve complaint");
      }
    } catch (error) {
      console.error("Error resolving complaint:", error);
      alert("Failed to resolve complaint");
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Complaint not found</p>
      </div>
    );
  }

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
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
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
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
                <CardTitle className="text-2xl">
                  {complaint.complaintNumber}
                </CardTitle>
                {getSourceBadge(complaint.source)}
                {getStatusBadge(complaint.status)}
                {complaint.serviceArea && (
                  <Badge variant="outline">{complaint.serviceArea}</Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Complaint Details */}
            <div>
              <h3 className="font-semibold mb-3">Complaint Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Received:</span>
                  <span>
                    {new Date(complaint.receivedAt).toLocaleString()}
                  </span>
                </div>
                {complaint.acknowledgedAt && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-muted-foreground">Acknowledged:</span>
                    <span>
                      {new Date(complaint.acknowledgedAt).toLocaleString()}
                    </span>
                  </div>
                )}
                {complaint.participant && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Participant:</span>
                    <span>
                      {complaint.participant.name || complaint.participant.email}
                    </span>
                  </div>
                )}
                {complaint.worker && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Worker:</span>
                    <span>
                      {complaint.worker.user.name || complaint.worker.user.email}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded">
                {complaint.description}
              </p>
            </div>

            {/* Resolution Actions */}
            {complaint.resolutions && complaint.resolutions.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Resolution Actions</h3>
                <div className="space-y-2">
                  {complaint.resolutions.map((res) => (
                    <div key={res.id} className="bg-muted p-3 rounded text-sm">
                      <p className="font-medium">{res.action}</p>
                      {res.outcome && (
                        <p className="text-muted-foreground mt-1">
                          Outcome: {res.outcome}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        By: {res.takenBy} •{" "}
                        {new Date(res.takenAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution */}
            {complaint.resolution ? (
              <div>
                <h3 className="font-semibold mb-2">Resolution</h3>
                <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded">
                  {complaint.resolution}
                </p>
                {complaint.resolvedAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Resolved on: {new Date(complaint.resolvedAt).toLocaleString()}
                  </p>
                )}
                {complaint.satisfactionRating && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-medium">Satisfaction:</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= complaint.satisfactionRating!
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h3 className="font-semibold mb-3">Resolution</h3>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border rounded-lg mb-3"
                  placeholder="Enter resolution details..."
                />
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-2">
                    Satisfaction Rating (Optional)
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSatisfactionRating(star)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            star <= satisfactionRating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300 hover:text-yellow-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleResolve}
                  disabled={resolving || !resolution.trim()}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {resolving ? "Resolving..." : "Resolve Complaint"}
                </Button>
              </div>
            )}

            {/* Status Actions */}
            <div className="flex gap-2 pt-4 border-t">
              {complaint.status === "RECEIVED" && (
                <Button
                  onClick={handleAcknowledge}
                  disabled={updating}
                  variant="outline"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Acknowledge Complaint
                </Button>
              )}
              {complaint.status === "ACKNOWLEDGED" && (
                <Button
                  onClick={() => {
                    // Update status to UNDER_INVESTIGATION
                    fetch(`/api/compliance/complaints/${params.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "UNDER_INVESTIGATION" }),
                    }).then(() => fetchComplaint());
                  }}
                  disabled={updating}
                  variant="outline"
                >
                  Mark Under Investigation
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
