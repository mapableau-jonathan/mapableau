"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const RISK_CATEGORIES = [
  "Operational",
  "Financial",
  "Compliance",
  "Safety",
  "Reputational",
  "Technology",
  "Other",
];

export default function CreateRiskPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    riskLevel: "MEDIUM" as typeof RISK_LEVELS[number],
    category: "Operational",
    participantId: "",
    owner: "",
    mitigationPlan: "",
    mitigationDate: "",
    reviewDate: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const response = await fetch("/api/compliance/risks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          riskLevel: formData.riskLevel,
          category: formData.category,
          participantId: formData.participantId || undefined,
          owner: formData.owner || undefined,
          mitigationPlan: formData.mitigationPlan || undefined,
          mitigationDate: formData.mitigationDate || undefined,
          reviewDate: formData.reviewDate || undefined,
        }),
      });

      if (response.ok) {
        const risk = await response.json();
        router.push(`/compliance/risks/${risk.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create risk");
      }
    } catch (error) {
      console.error("Error creating risk:", error);
      alert("Failed to create risk");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Identify New Risk</h1>
        <p className="text-muted-foreground">
          Document and assess a new risk
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Risk Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="e.g., Data breach risk"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Risk Level <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.riskLevel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      riskLevel: e.target.value as typeof RISK_LEVELS[number],
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  {RISK_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  {RISK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={8}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Describe the risk in detail..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Risk Owner
                </label>
                <input
                  type="text"
                  value={formData.owner}
                  onChange={(e) =>
                    setFormData({ ...formData, owner: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Person responsible"
                />
              </div>

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
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Mitigation Plan
              </label>
              <textarea
                value={formData.mitigationPlan}
                onChange={(e) =>
                  setFormData({ ...formData, mitigationPlan: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Describe how this risk will be mitigated..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Mitigation Date
                </label>
                <input
                  type="date"
                  value={formData.mitigationDate}
                  onChange={(e) =>
                    setFormData({ ...formData, mitigationDate: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Review Date
                </label>
                <input
                  type="date"
                  value={formData.reviewDate}
                  onChange={(e) =>
                    setFormData({ ...formData, reviewDate: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Creating..." : "Create Risk"}
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
