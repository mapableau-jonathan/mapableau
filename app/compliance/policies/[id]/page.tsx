"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Users, Calendar, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PolicyDetail {
  id: string;
  title: string;
  category: string;
  version: string;
  status: string;
  content: Record<string, unknown>;
  effectiveDate: string;
  reviewDate?: string | null;
  nextReviewDate?: string | null;
  acknowledgments: Array<{
    id: string;
    user: { id: string; name: string; email: string };
    acknowledgedAt: string;
  }>;
  assignedUsers: Array<{
    id: string;
    user: { id: string; name: string; email: string };
    assignedAt: string;
  }>;
}

export default function PolicyDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchPolicy();
    }
  }, [params.id]);

  const fetchPolicy = async () => {
    try {
      const response = await fetch(`/api/compliance/policies/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setPolicy(data);
      }
    } catch (error) {
      console.error("Error fetching policy:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!session?.user?.id) return;

    setAcknowledging(true);
    try {
      const response = await fetch(
        `/api/compliance/policies/${params.id}/acknowledge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      if (response.ok) {
        await fetchPolicy();
      }
    } catch (error) {
      console.error("Error acknowledging policy:", error);
    } finally {
      setAcknowledging(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Policy not found</p>
      </div>
    );
  }

  const isAcknowledged = policy.acknowledgments.some(
    (ack) => ack.user.id === session?.user?.id
  );
  const isAssigned = policy.assignedUsers.some(
    (assignment) => assignment.user.id === session?.user?.id
  );

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
            <div>
              <CardTitle className="text-2xl mb-2">{policy.title}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{policy.category}</Badge>
                <Badge>{policy.status}</Badge>
                <span className="text-sm text-muted-foreground">
                  Version {policy.version}
                </span>
              </div>
            </div>
            {isAssigned && !isAcknowledged && (
              <Button
                onClick={handleAcknowledge}
                disabled={acknowledging}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {acknowledging ? "Acknowledging..." : "Acknowledge Policy"}
              </Button>
            )}
            {isAcknowledged && (
              <Badge variant="default" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Acknowledged
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  Effective Date
                </div>
                <p>{new Date(policy.effectiveDate).toLocaleDateString()}</p>
              </div>
              {policy.reviewDate && (
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    Review Date
                  </div>
                  <p>{new Date(policy.reviewDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">Policy Content</h3>
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded">
                  {JSON.stringify(policy.content, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acknowledgment Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Acknowledgment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {policy.acknowledgments.length} of {policy.assignedUsers.length}{" "}
                assigned users have acknowledged
              </p>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${
                      (policy.acknowledgments.length /
                        Math.max(policy.assignedUsers.length, 1)) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Acknowledged Users</h4>
              <div className="space-y-2">
                {policy.acknowledgments.map((ack) => (
                  <div
                    key={ack.id}
                    className="flex items-center justify-between p-2 bg-green-50 rounded"
                  >
                    <span className="text-sm">
                      {ack.user.name || ack.user.email}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ack.acknowledgedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
