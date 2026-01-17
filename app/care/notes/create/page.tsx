"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Save, X, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const NOTE_TYPES = [
  "PROGRESS",
  "MEDICATION",
  "PERSONAL_CARE",
  "INCIDENT",
  "ACTIVITY",
  "OTHER",
] as const;

export default function CreateCaseNotePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const carePlanId = searchParams.get("carePlanId");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    carePlanId: carePlanId || "",
    noteType: "PROGRESS" as typeof NOTE_TYPES[number],
    content: "",
  });
  const [carePlans, setCarePlans] = useState<Array<{ id: string; planName: string }>>([]);

  useEffect(() => {
    if (!carePlanId) {
      fetchCarePlans();
    }
  }, [carePlanId]);

  const fetchCarePlans = async () => {
    try {
      const response = await fetch("/api/care/plans");
      if (response.ok) {
        const data = await response.json();
        setCarePlans(data.carePlans || []);
      }
    } catch (error) {
      console.error("Error fetching care plans:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id || !formData.carePlanId) return;

    setLoading(true);
    try {
      const response = await fetch("/api/care/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carePlanId: formData.carePlanId,
          noteType: formData.noteType,
          content: formData.content,
        }),
      });

      if (response.ok) {
        const note = await response.json();
        router.push(`/care/notes/${note.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create case note");
      }
    } catch (error) {
      console.error("Error creating case note:", error);
      alert("Failed to create case note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Create Case Note</h1>
        <p className="text-muted-foreground">
          Document care activities and progress
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Note Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!carePlanId && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Care Plan <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.carePlanId}
                  onChange={(e) =>
                    setFormData({ ...formData, carePlanId: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">Select Care Plan</option>
                  {carePlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.planName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Note Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.noteType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    noteType: e.target.value as typeof NOTE_TYPES[number],
                  })
                }
                className="w-full px-4 py-2 border rounded-lg"
              >
                {NOTE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                rows={15}
                className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
                placeholder="Enter case note content..."
              />
              <p className="text-xs text-muted-foreground mt-2">
                Tip: Use templates for consistent formatting. Click "Use Template" for structured notes.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Creating..." : "Create Note"}
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
