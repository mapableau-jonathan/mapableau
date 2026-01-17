"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const JOB_TYPES = ["Full-time", "Part-time", "Casual", "Contract"];
const JOB_CATEGORIES = [
  "Administration",
  "Customer Service",
  "Healthcare",
  "Retail",
  "Hospitality",
  "Other",
];
const ACCESSIBILITY_FEATURES = [
  "Wheelchair Accessible",
  "Accessible Parking",
  "Accessible Restrooms",
  "Sign Language Interpreter Available",
  "Assistive Technology Available",
  "Flexible Work Arrangements",
];

export default function PostJobPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    city: "",
    state: "",
    postcode: "",
    address: "",
    jobType: "Full-time",
    category: "Other",
    salaryMin: "",
    salaryMax: "",
    requiredSkills: [] as string[],
    accessibilityRequirements: [] as string[],
    applicationDeadline: "",
  });
  const [skillInput, setSkillInput] = useState("");

  const addSkill = () => {
    if (skillInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        requiredSkills: [...prev.requiredSkills, skillInput.trim()],
      }));
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      requiredSkills: prev.requiredSkills.filter((s) => s !== skill),
    }));
  };

  const toggleAccessibility = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      accessibilityRequirements: prev.accessibilityRequirements.includes(
        feature
      )
        ? prev.accessibilityRequirements.filter((f) => f !== feature)
        : [...prev.accessibilityRequirements, feature],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const response = await fetch("/api/jobs/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employerId: session.user.id,
          title: formData.title,
          description: formData.description,
          location: {
            address: formData.address,
            city: formData.city,
            state: formData.state,
            postcode: formData.postcode,
          },
          jobType: formData.jobType,
          category: formData.category,
          salaryRange:
            formData.salaryMin && formData.salaryMax
              ? {
                  min: parseFloat(formData.salaryMin),
                  max: parseFloat(formData.salaryMax),
                  currency: "AUD",
                }
              : undefined,
          requiredSkills: formData.requiredSkills,
          accessibilityRequirements: formData.accessibilityRequirements,
          applicationDeadline: formData.applicationDeadline
            ? new Date(formData.applicationDeadline).toISOString()
            : undefined,
        }),
      });

      if (response.ok) {
        const job = await response.json();
        router.push(`/jobs/${job.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to post job");
      }
    } catch (error) {
      console.error("Error posting job:", error);
      alert("Failed to post job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Post a Job</h1>
        <p className="text-muted-foreground">
          Create a job listing for accessible employment opportunities
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="e.g., Customer Service Representative"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Job Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.jobType}
                  onChange={(e) =>
                    setFormData({ ...formData, jobType: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  {JOB_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
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
                  {JOB_CATEGORIES.map((cat) => (
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
                rows={10}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Describe the job role, responsibilities, and requirements..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  className="px-4 py-2 border rounded-lg"
                  placeholder="City"
                />
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  className="px-4 py-2 border rounded-lg"
                  placeholder="State"
                />
                <input
                  type="text"
                  required
                  value={formData.postcode}
                  onChange={(e) =>
                    setFormData({ ...formData, postcode: e.target.value })
                  }
                  className="px-4 py-2 border rounded-lg"
                  placeholder="Postcode"
                />
              </div>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Salary Range (Min)
                </label>
                <input
                  type="number"
                  value={formData.salaryMin}
                  onChange={(e) =>
                    setFormData({ ...formData, salaryMin: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., 50000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Salary Range (Max)
                </label>
                <input
                  type="number"
                  value={formData.salaryMax}
                  onChange={(e) =>
                    setFormData({ ...formData, salaryMax: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., 70000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Required Skills
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg"
                  placeholder="Enter skill and press Enter"
                />
                <Button type="button" onClick={addSkill} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.requiredSkills.map((skill) => (
                  <Badge key={skill} variant="default">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-2"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Accessibility Features
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ACCESSIBILITY_FEATURES.map((feature) => (
                  <button
                    key={feature}
                    type="button"
                    onClick={() => toggleAccessibility(feature)}
                    className={`p-2 border rounded-lg text-sm text-left transition-colors ${
                      formData.accessibilityRequirements.includes(feature)
                        ? "border-primary bg-primary/10"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    {feature}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Application Deadline
              </label>
              <input
                type="date"
                value={formData.applicationDeadline}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    applicationDeadline: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Posting..." : "Post Job"}
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
