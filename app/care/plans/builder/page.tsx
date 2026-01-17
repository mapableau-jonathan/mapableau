"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, X, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Goal {
  description: string;
  targetDate: string;
  status: "ACTIVE" | "ACHIEVED" | "ON_HOLD";
}

export default function CarePlanBuilderPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    participantId: "",
    planName: "",
    startDate: new Date().toISOString().split("T")[0],
    reviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  });
  const [goals, setGoals] = useState<Goal[]>([
    { description: "", targetDate: "", status: "ACTIVE" },
  ]);

  const addGoal = () => {
    setGoals([...goals, { description: "", targetDate: "", status: "ACTIVE" }]);
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const updateGoal = (index: number, field: keyof Goal, value: string) => {
    const updated = [...goals];
    updated[index] = { ...updated[index], [field]: value };
    setGoals(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id || !formData.participantId) return;

    // Validate goals
    const validGoals = goals.filter(
      (g) => g.description.trim() && g.targetDate
    );
    if (validGoals.length === 0) {
      alert("Please add at least one goal");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/care/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: formData.participantId,
          planName: formData.planName,
          goals: validGoals.map((g) => ({
            description: g.description,
            targetDate: new Date(g.targetDate).toISOString(),
            status: g.status,
          })),
          startDate: new Date(formData.startDate).toISOString(),
          reviewDate: new Date(formData.reviewDate).toISOString(),
        }),
      });

      if (response.ok) {
        const carePlan = await response.json();
        router.push(`/care/plans/${carePlan.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create care plan");
      }
    } catch (error) {
      console.error("Error creating care plan:", error);
      alert("Failed to create care plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Create Care Plan</h1>
        <p className="text-muted-foreground">
          Build a personalized care plan with goals and services
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Plan Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Participant ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.participantId}
                onChange={(e) =>
                  setFormData({ ...formData, participantId: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Enter participant user ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Plan Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.planName}
                onChange={(e) =>
                  setFormData({ ...formData, planName: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="e.g., Personal Care Plan 2024"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Review Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.reviewDate}
                  onChange={(e) =>
                    setFormData({ ...formData, reviewDate: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Goals</CardTitle>
              <Button type="button" onClick={addGoal} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.map((goal, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">Goal {index + 1}</h4>
                  {goals.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeGoal(index)}
                      variant="ghost"
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={goal.description}
                    onChange={(e) =>
                      updateGoal(index, "description", e.target.value)
                    }
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Describe the goal..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Target Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={goal.targetDate}
                      onChange={(e) =>
                        updateGoal(index, "targetDate", e.target.value)
                      }
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Status
                    </label>
                    <select
                      value={goal.status}
                      onChange={(e) =>
                        updateGoal(
                          index,
                          "status",
                          e.target.value as Goal["status"]
                        )
                      }
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="ACHIEVED">Achieved</option>
                      <option value="ON_HOLD">On Hold</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Creating..." : "Create Care Plan"}
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
    </div>
  );
}
