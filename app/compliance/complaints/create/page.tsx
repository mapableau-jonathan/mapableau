"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const COMPLAINT_SOURCES = [
  "PARTICIPANT",
  "FAMILY",
  "WORKER",
  "ANONYMOUS",
  "OTHER",
] as const;

const SERVICE_AREAS = [
  "Care",
  "Transport",
  "Jobs",
  "Support Coordination",
  "Other",
];

export default function CreateComplaintPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    source: "PARTICIPANT" as typeof COMPLAINT_SOURCES[number],
    description: "",
    serviceArea: "",
    participantId: "",
    workerId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const response = await fetch("/api/compliance/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: formData.source,
          description: formData.description,
          serviceArea: formData.serviceArea || undefined,
          participantId: formData.participantId || undefined,
          workerId: formData.workerId || undefined,
        }),
      });

      if (response.ok) {
        const complaint = await response.json();
        router.push(`/compliance/complaints/${complaint.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create complaint");
      }
    } catch (error) {
      console.error("Error creating complaint:", error);
      alert("Failed to create complaint");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Submit Complaint</h1>
        <p className="text-muted-foreground">
          Submit a complaint or feedback about services
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Complaint Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Source <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.source}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    source: e.target.value as typeof COMPLAINT_SOURCES[number],
                  })
                }
                className="w-full px-4 py-2 border rounded-lg"
              >
                {COMPLAINT_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Service Area
              </label>
              <select
                value={formData.serviceArea}
                onChange={(e) =>
                  setFormData({ ...formData, serviceArea: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">Select Service Area</option>
                {SERVICE_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Please provide a detailed description of your complaint or
                concern.
              </p>
              <textarea
                required
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={10}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Describe your complaint in detail..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Participant ID (if applicable)
                </label>
                <input
                  type="text"
                  value={formData.participantId}
                  onChange={(e) =>
                    setFormData({ ...formData, participantId: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Worker ID (if applicable)
                </label>
                <input
                  type="text"
                  value={formData.workerId}
                  onChange={(e) =>
                    setFormData({ ...formData, workerId: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> All complaints are taken seriously and
                will be investigated. If you submit anonymously, we will still
                review your complaint but may not be able to provide direct
                feedback.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Submitting..." : "Submit Complaint"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
