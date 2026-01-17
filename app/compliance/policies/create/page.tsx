"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const POLICY_CATEGORIES = [
  "CORE",
  "CARE",
  "TRANSPORT",
  "WORKFORCE",
  "PRIVACY",
  "WHS",
  "OTHER",
] as const;

export default function CreatePolicyPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "CORE" as typeof POLICY_CATEGORIES[number],
    version: "1.0",
    content: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    reviewDate: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      // Parse content as JSON
      let parsedContent: Record<string, unknown>;
      try {
        parsedContent = JSON.parse(formData.content || "{}");
      } catch {
        // If not valid JSON, wrap in a simple structure
        parsedContent = { text: formData.content };
      }

      const response = await fetch("/api/compliance/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          category: formData.category,
          version: formData.version,
          content: parsedContent,
          effectiveDate: formData.effectiveDate,
          reviewDate: formData.reviewDate || undefined,
        }),
      });

      if (response.ok) {
        const policy = await response.json();
        router.push(`/compliance/policies/${policy.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create policy");
      }
    } catch (error) {
      console.error("Error creating policy:", error);
      alert("Failed to create policy");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Create New Policy</h1>
        <p className="text-muted-foreground">
          Create a new policy document for compliance management
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Policy Details</CardTitle>
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
                placeholder="e.g., Incident Management Policy"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as typeof POLICY_CATEGORIES[number],
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  {POLICY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Version <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.version}
                  onChange={(e) =>
                    setFormData({ ...formData, version: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., 1.0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Effective Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.effectiveDate}
                  onChange={(e) =>
                    setFormData({ ...formData, effectiveDate: e.target.value })
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

            <div>
              <label className="block text-sm font-medium mb-2">
                Policy Content <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Enter JSON format or plain text. JSON will be parsed, text will
                be wrapped in a simple structure.
              </p>
              <textarea
                required
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                rows={15}
                className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
                placeholder='{"sections": [{"title": "Section 1", "content": "..."}]}'
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Creating..." : "Create Policy"}
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
