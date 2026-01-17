"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MapPin, Calendar, Users, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ACCESSIBILITY_REQUIREMENTS = [
  "Wheelchair Accessible",
  "Hoist/Lift Available",
  "Low Floor Entry",
  "Wheelchair Securing Points",
  "Assistance Required",
  "Other",
];

export default function BookTransportPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    participantId: "",
    pickupAddress: "",
    pickupLatitude: 0,
    pickupLongitude: 0,
    dropoffAddress: "",
    dropoffLatitude: 0,
    dropoffLongitude: 0,
    scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16),
    passengerCount: 1,
    accessibilityRequirements: [] as string[],
    notes: "",
  });

  const toggleRequirement = (requirement: string) => {
    setFormData((prev) => ({
      ...prev,
      accessibilityRequirements: prev.accessibilityRequirements.includes(
        requirement
      )
        ? prev.accessibilityRequirements.filter((r) => r !== requirement)
        : [...prev.accessibilityRequirements, requirement],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id || !formData.participantId) return;

    setLoading(true);
    try {
      const response = await fetch("/api/transport/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: formData.participantId,
          pickupLocation: {
            address: formData.pickupAddress,
            latitude: formData.pickupLatitude,
            longitude: formData.pickupLongitude,
          },
          dropoffLocation: {
            address: formData.dropoffAddress,
            latitude: formData.dropoffLatitude,
            longitude: formData.dropoffLongitude,
          },
          scheduledTime: new Date(formData.scheduledTime).toISOString(),
          accessibilityRequirements: formData.accessibilityRequirements,
          passengerCount: formData.passengerCount,
          notes: formData.notes || undefined,
        }),
      });

      if (response.ok) {
        const booking = await response.json();
        router.push(`/transport/bookings/${booking.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create booking");
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Book Transport</h1>
        <p className="text-muted-foreground">
          Book accessible transport for your journey
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Journey Details</CardTitle>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Pickup Location <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={formData.pickupAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, pickupAddress: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    placeholder="Enter pickup address"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Use map to select location (coming soon)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Drop-off Location <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={formData.dropoffAddress}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dropoffAddress: e.target.value,
                      })
                    }
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    placeholder="Enter drop-off address"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Scheduled Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="datetime-local"
                    required
                    value={formData.scheduledTime}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledTime: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Passengers <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.passengerCount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        passengerCount: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Accessibility Requirements
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ACCESSIBILITY_REQUIREMENTS.map((req) => (
                  <button
                    key={req}
                    type="button"
                    onClick={() => toggleRequirement(req)}
                    className={`p-2 border rounded-lg text-sm text-left transition-colors ${
                      formData.accessibilityRequirements.includes(req)
                        ? "border-primary bg-primary/10"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    {req}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Additional requirements or notes..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Booking..." : "Book Transport"}
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
      </form>
    </div>
  );
}
