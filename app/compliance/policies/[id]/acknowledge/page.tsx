"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle2, FileText, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Policy {
  id: string;
  title: string;
  category: string;
  version: string;
  status: string;
  content: Record<string, unknown>;
  effectiveDate: string;
}

export default function AcknowledgePolicyPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

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
        // Check if already acknowledged
        const isAcknowledged = data.acknowledgments?.some(
          (ack: { user: { id: string } }) =>
            ack.user.id === session?.user?.id
        );
        setAcknowledged(isAcknowledged);
      }
    } catch (error) {
      console.error("Error fetching policy:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!session?.user?.id || !policy) return;

    setAcknowledging(true);
    try {
      const response = await fetch(
        `/api/compliance/policies/${params.id}/acknowledge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signature: `Acknowledged by ${session.user.email} on ${new Date().toISOString()}`,
          }),
        }
      );

      if (response.ok) {
        setAcknowledged(true);
        // Redirect after a short delay
        setTimeout(() => {
          router.push(`/compliance/policies/${params.id}`);
        }, 2000);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to acknowledge policy");
      }
    } catch (error) {
      console.error("Error acknowledging policy:", error);
      alert("Failed to acknowledge policy");
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
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p>Policy not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (acknowledged) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Policy Acknowledged</h2>
            <p className="text-muted-foreground mb-4">
              You have successfully acknowledged this policy.
            </p>
            <Button onClick={() => router.push(`/compliance/policies/${params.id}`)}>
              View Policy
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Acknowledge Policy</h1>
        <p className="text-muted-foreground">
          Please read and acknowledge this policy document
        </p>
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
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Effective Date:</strong>{" "}
                {new Date(policy.effectiveDate).toLocaleDateString()}
              </p>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-4">Policy Content</h3>
              <div className="prose max-w-none">
                <div className="bg-muted p-6 rounded-lg max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(policy.content, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>By acknowledging this policy, you confirm that:</strong>
                </p>
                <ul className="list-disc list-inside mt-2 text-sm text-blue-800 space-y-1">
                  <li>You have read and understood this policy</li>
                  <li>You agree to comply with the requirements outlined</li>
                  <li>You understand the consequences of non-compliance</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleAcknowledge}
                disabled={acknowledging}
                size="lg"
                className="flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {acknowledging ? "Acknowledging..." : "I Acknowledge This Policy"}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.back()}
                size="lg"
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
