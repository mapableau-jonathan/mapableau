"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DocumentUpload } from "@/components/workers/document-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export default function WorkerOnboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    role: "",
    employerId: "",
    identity: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      documentType: "drivers_licence" as "drivers_licence" | "passport",
      documentNumber: "",
      state: "",
      expiryDate: "",
    },
    vevo: {
      passportNumber: "",
      dateOfBirth: "",
      firstName: "",
      lastName: "",
      visaGrantNumber: "",
      transactionReferenceNumber: "",
    },
    wwcc: {
      wwccNumber: "",
      state: "",
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      expiryDate: "",
    },
    ndis: {
      screeningId: "",
      applicationId: "",
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      employerId: "",
    },
    firstAid: {
      certificateNumber: "",
      rtoNumber: "",
      unitCode: "",
      issueDate: "",
      expiryDate: "",
      usiNumber: "",
    },
  });

  const [documents, setDocuments] = useState<Array<{
    type: string;
    fileUrl: string;
    metadata?: Record<string, unknown>;
  }>>([]);

  const handleFileUpload = async (type: string, file: File): Promise<string> => {
    // Upload file to server
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to upload file");
    }

    const data = await response.json();
    const fileUrl = data.fileUrl;

    setDocuments((prev) => [
      ...prev.filter((d) => d.type !== type),
      { type, fileUrl },
    ]);

    return fileUrl;
  };

  const handleSubmit = async () => {
    if (!session?.user?.id) {
      setError("You must be logged in to onboard");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/workers/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: formData.role,
          employerId: formData.employerId,
          identity: formData.identity,
          vevo: formData.vevo,
          wwcc: formData.wwcc,
          ndis: formData.ndis,
          firstAid: formData.firstAid,
          documents,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to onboard");
      }

      const data = await response.json();
      router.push(`/workers/dashboard?workerId=${data.workerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to onboard");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 7) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Worker Onboarding</CardTitle>
          <p className="text-sm text-muted-foreground">
            Step {currentStep} of 7
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded">
              {error}
            </div>
          )}

          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Personal Information</h2>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, role: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., Support Worker"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Employer ID (optional)
                </label>
                <input
                  type="text"
                  value={formData.employerId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      employerId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
          )}

          {/* Step 2: Identity Documents */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Identity Verification</h2>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Document Type
                </label>
                <select
                  value={formData.identity.documentType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      identity: {
                        ...prev.identity,
                        documentType: e.target.value as "drivers_licence" | "passport",
                      },
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="drivers_licence">Driver's Licence</option>
                  <option value="passport">Passport</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.identity.firstName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        identity: { ...prev.identity, firstName: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.identity.lastName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        identity: { ...prev.identity, lastName: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.identity.dateOfBirth}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      identity: { ...prev.identity, dateOfBirth: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Document Number
                </label>
                <input
                  type="text"
                  value={formData.identity.documentNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      identity: { ...prev.identity, documentNumber: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              {formData.identity.documentType === "drivers_licence" && (
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <select
                    value={formData.identity.state}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        identity: { ...prev.identity, state: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">Select state</option>
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="QLD">QLD</option>
                    <option value="WA">WA</option>
                    <option value="SA">SA</option>
                    <option value="TAS">TAS</option>
                    <option value="NT">NT</option>
                    <option value="ACT">ACT</option>
                  </select>
                </div>
              )}
              <DocumentUpload
                documentType={
                  formData.identity.documentType === "drivers_licence"
                    ? "drivers_licence_front"
                    : "passport"
                }
                label="Upload Document"
                onUpload={(file) =>
                  handleFileUpload(
                    formData.identity.documentType === "drivers_licence"
                      ? "drivers_licence_front"
                      : "passport",
                    file
                  )
                }
              />
            </div>
          )}

          {/* Step 3: VEVO */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Work Rights (VEVO)</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.vevo.firstName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        vevo: { ...prev.vevo, firstName: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.vevo.lastName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        vevo: { ...prev.vevo, lastName: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Passport Number
                </label>
                <input
                  type="text"
                  value={formData.vevo.passportNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      vevo: { ...prev.vevo, passportNumber: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.vevo.dateOfBirth}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      vevo: { ...prev.vevo, dateOfBirth: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Visa Grant Number (optional)
                </label>
                <input
                  type="text"
                  value={formData.vevo.visaGrantNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      vevo: { ...prev.vevo, visaGrantNumber: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
          )}

          {/* Step 4: WWCC */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                Working with Children Check
              </h2>
              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <select
                  value={formData.wwcc.state}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      wwcc: { ...prev.wwcc, state: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">Select state</option>
                  <option value="NSW">NSW</option>
                  <option value="VIC">VIC</option>
                  <option value="QLD">QLD</option>
                  <option value="WA">WA</option>
                  <option value="SA">SA</option>
                  <option value="TAS">TAS</option>
                  <option value="NT">NT</option>
                  <option value="ACT">ACT</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  WWCC Number
                </label>
                <input
                  type="text"
                  value={formData.wwcc.wwccNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      wwcc: { ...prev.wwcc, wwccNumber: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.wwcc.firstName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        wwcc: { ...prev.wwcc, firstName: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.wwcc.lastName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        wwcc: { ...prev.wwcc, lastName: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.wwcc.dateOfBirth}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      wwcc: { ...prev.wwcc, dateOfBirth: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
          )}

          {/* Step 5: NDIS */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">NDIS Worker Screening</h2>
              <p className="text-sm text-muted-foreground">
                If you have a Screening ID or Application ID, enter it below.
                Otherwise, you'll need to complete the check through the NDIS
                portal.
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Screening ID (optional)
                </label>
                <input
                  type="text"
                  value={formData.ndis.screeningId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ndis: { ...prev.ndis, screeningId: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Application ID (optional)
                </label>
                <input
                  type="text"
                  value={formData.ndis.applicationId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ndis: { ...prev.ndis, applicationId: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.ndis.firstName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        ndis: { ...prev.ndis, firstName: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.ndis.lastName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        ndis: { ...prev.ndis, lastName: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.ndis.dateOfBirth}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ndis: { ...prev.ndis, dateOfBirth: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Employer ID
                </label>
                <input
                  type="text"
                  value={formData.ndis.employerId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ndis: { ...prev.ndis, employerId: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
          )}

          {/* Step 6: First Aid */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">First Aid Certificate</h2>
              <div>
                <label className="block text-sm font-medium mb-1">
                  USI Number (optional - for automatic verification)
                </label>
                <input
                  type="text"
                  value={formData.firstAid.usiNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstAid: { ...prev.firstAid, usiNumber: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Certificate Number
                </label>
                <input
                  type="text"
                  value={formData.firstAid.certificateNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstAid: {
                        ...prev.firstAid,
                        certificateNumber: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  RTO Number
                </label>
                <input
                  type="text"
                  value={formData.firstAid.rtoNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstAid: { ...prev.firstAid, rtoNumber: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Unit Code (e.g., HLTAID011)
                </label>
                <input
                  type="text"
                  value={formData.firstAid.unitCode}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstAid: { ...prev.firstAid, unitCode: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <DocumentUpload
                documentType="first_aid_certificate"
                label="Upload First Aid Certificate"
                onUpload={(file) =>
                  handleFileUpload("first_aid_certificate", file)
                }
              />
            </div>
          )}

          {/* Step 7: Review */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Review & Submit</h2>
              <p className="text-sm text-muted-foreground">
                Please review your information before submitting.
              </p>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Role:</strong> {formData.role || "Not specified"}
                </p>
                <p>
                  <strong>Identity:</strong> {formData.identity.firstName}{" "}
                  {formData.identity.lastName}
                </p>
                <p>
                  <strong>Documents uploaded:</strong> {documents.length}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            {currentStep < 7 ? (
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={loading}>
                {loading ? "Submitting..." : "Submit"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
