"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MessageSquare, Star, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const FEEDBACK_CATEGORIES = [
  "Service Quality",
  "Worker Performance",
  "Communication",
  "Accessibility",
  "Payment/Billing",
  "Platform/Technology",
  "Other",
];

const FEEDBACK_SOURCES = [
  "PARTICIPANT",
  "FAMILY",
  "WORKER",
  "ANONYMOUS",
] as const;

export default function FeedbackPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    source: "PARTICIPANT" as typeof FEEDBACK_SOURCES[number],
    category: FEEDBACK_CATEGORIES[0],
    feedback: "",
    rating: 0,
    anonymous: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id && !formData.anonymous) return;

    setLoading(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: formData.source,
          category: formData.category,
          feedback: formData.feedback,
          rating: formData.rating > 0 ? formData.rating : undefined,
          anonymous: formData.anonymous,
          ...(formData.anonymous
            ? {}
            : { participantId: session?.user?.id }),
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          router.push("/");
        }, 3000);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to submit feedback");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-16 w-16 mx-auto text-green-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground">
              Your feedback has been received and will be reviewed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Provide Feedback</h1>
        <p className="text-muted-foreground">
          Help us improve MapAble by sharing your experience
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Feedback Form</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Source
              </label>
              <select
                value={formData.source}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    source: e.target.value as typeof FEEDBACK_SOURCES[number],
                  })
                }
                className="w-full px-4 py-2 border rounded-lg"
              >
                {FEEDBACK_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg"
              >
                {FEEDBACK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Rating (Optional)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= formData.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300 hover:text-yellow-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Feedback <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.feedback}
                onChange={(e) =>
                  setFormData({ ...formData, feedback: e.target.value })
                }
                rows={8}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Share your feedback, suggestions, or concerns..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="anonymous"
                checked={formData.anonymous}
                onChange={(e) =>
                  setFormData({ ...formData, anonymous: e.target.checked })
                }
                className="w-4 h-4"
              />
              <label htmlFor="anonymous" className="text-sm">
                Submit anonymously
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
