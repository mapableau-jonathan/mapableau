"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CreateIncidentPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    incidentType: "MINOR_INCIDENT",
    description: "",
    occurredAt: new Date().toISOString().slice(0, 16),
    location: "",
    participantId: "",
    workerId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const response = await fetch("/api/compliance/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          occurredAt: new Date(formData.occurredAt).toISOString(),
          participantId: formData.participantId || undefined,
          workerId: formData.workerId || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/compliance/incidents/${data.id}`);
      }
    } catch (error) {
      console.error("Error creating incident:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Report Incident</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Incident Type *
              </label>
              <select
                value={formData.incidentType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    incidentType: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="SERIOUS_INCIDENT">Serious Incident</option>
                <option value="REPORTABLE_INCIDENT">Reportable Incident</option>
                <option value="NEAR_MISS">Near Miss</option>
                <option value="MINOR_INCIDENT">Minor Incident</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-lg"
                rows={5}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Occurred At *
              </label>
              <input
                type="datetime-local"
                value={formData.occurredAt}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    occurredAt: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Submit Incident"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
