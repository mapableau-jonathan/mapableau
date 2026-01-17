"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Save, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SERVICE_CATEGORIES = [
  "Assistance with Daily Life",
  "Transport",
  "Consumables",
  "Assistance with Social and Community Participation",
  "Assistive Technology",
  "Home Modifications",
  "Coordination of Supports",
  "Improved Living Arrangements",
  "Increased Social and Community Participation",
  "Finding and Keeping a Job",
  "Improved Relationships",
  "Improved Health and Wellbeing",
  "Improved Learning",
  "Improved Life Choices",
  "Improved Daily Living",
];

export default function ProviderRegistrationPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    providerNumber: "",
    serviceCategories: [] as string[],
  });
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    message?: string;
  } | null>(null);

  const handleVerifyProvider = async () => {
    if (!formData.providerNumber.trim()) {
      alert("Please enter a provider number");
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch("/api/ndia/providers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerNumber: formData.providerNumber,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setVerificationResult(result);
        if (result.valid) {
          setStep(2);
        }
      } else {
        const error = await response.json();
        setVerificationResult({
          valid: false,
          message: error.error || "Verification failed",
        });
      }
    } catch (error) {
      console.error("Error verifying provider:", error);
      setVerificationResult({
        valid: false,
        message: "Failed to verify provider",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const response = await fetch("/api/providers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerNumber: formData.providerNumber,
          serviceCategories: formData.serviceCategories,
        }),
      });

      if (response.ok) {
        const registration = await response.json();
        router.push(`/providers/register/status?id=${registration.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to register provider");
      }
    } catch (error) {
      console.error("Error registering provider:", error);
      alert("Failed to register provider");
    } finally {
      setLoading(false);
    }
  };

  const toggleServiceCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceCategories: prev.serviceCategories.includes(category)
        ? prev.serviceCategories.filter((c) => c !== category)
        : [...prev.serviceCategories, category],
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">NDIS Provider Registration</h1>
        <p className="text-muted-foreground">
          Register as an NDIS provider to offer services on MapAble
        </p>
      </div>

      {/* Step Indicator */}
      <div className="mb-6 flex items-center gap-4">
        <div
          className={`flex items-center gap-2 ${
            step >= 1 ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 1 ? "bg-primary text-white" : "bg-muted"
            }`}
          >
            1
          </div>
          <span>Verify Provider</span>
        </div>
        <div className="flex-1 h-px bg-muted" />
        <div
          className={`flex items-center gap-2 ${
            step >= 2 ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 2 ? "bg-primary text-white" : "bg-muted"
            }`}
          >
            2
          </div>
          <span>Select Services</span>
        </div>
        <div className="flex-1 h-px bg-muted" />
        <div
          className={`flex items-center gap-2 ${
            step >= 3 ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 3 ? "bg-primary text-white" : "bg-muted"
            }`}
          >
            3
          </div>
          <span>Complete</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Verify Provider Number</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  NDIS Provider Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.providerNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, providerNumber: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Enter your NDIS provider number"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your provider number from the NDIS Commission
                </p>
              </div>

              {verificationResult && (
                <div
                  className={`p-4 rounded-lg ${
                    verificationResult.valid
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {verificationResult.valid ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <p
                      className={
                        verificationResult.valid
                          ? "text-green-900"
                          : "text-red-900"
                      }
                    >
                      {verificationResult.message}
                    </p>
                  </div>
                </div>
              )}

              <Button
                type="button"
                onClick={handleVerifyProvider}
                disabled={verifying || !formData.providerNumber.trim()}
              >
                {verifying ? "Verifying..." : "Verify Provider"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Select Service Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select the service categories you are registered to provide:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SERVICE_CATEGORIES.map((category) => {
                  const isSelected = formData.serviceCategories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleServiceCategory(category)}
                      className={`p-3 border rounded-lg text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{category}</span>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {formData.serviceCategories.length > 0 && (
                <div className="pt-4">
                  <p className="text-sm font-medium mb-2">Selected Categories:</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.serviceCategories.map((category) => (
                      <Badge key={category} variant="default">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={formData.serviceCategories.length === 0}
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Complete Registration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Review your registration:</strong>
                </p>
                <div className="mt-2 space-y-1 text-sm text-blue-800">
                  <p>Provider Number: {formData.providerNumber}</p>
                  <p>
                    Service Categories: {formData.serviceCategories.length} selected
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                >
                  Back
                </Button>
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Registering..." : "Complete Registration"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
