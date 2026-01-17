"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Registration {
  id: string;
  providerNumber: string;
  registrationStatus: string;
  serviceCategories: string[];
  verifiedAt?: string;
  expiresAt?: string;
}

export default function RegistrationStatusPage() {
  const searchParams = useSearchParams();
  const registrationId = searchParams.get("id");
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (registrationId) {
      fetchRegistration();
    }
  }, [registrationId]);

  const fetchRegistration = async () => {
    try {
      const response = await fetch(`/api/providers/register/${registrationId}`);
      if (response.ok) {
        const data = await response.json();
        setRegistration(data);
      }
    } catch (error) {
      console.error("Error fetching registration:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Registration not found</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    if (status === "ACTIVE") {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    } else if (status === "PENDING") {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <AlertCircle className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Provider Registration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Registration Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Provider Number:</span>
                  <span className="font-medium">{registration.providerNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  {getStatusBadge(registration.registrationStatus)}
                </div>
                {registration.verifiedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Verified:</span>
                    <span>
                      {new Date(registration.verifiedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {registration.expiresAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Expires:</span>
                    <span>
                      {new Date(registration.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {registration.serviceCategories.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Service Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {registration.serviceCategories.map((category) => (
                    <Badge key={category} variant="outline">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {registration.registrationStatus === "ACTIVE" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-green-900 font-medium">
                    Registration Complete
                  </p>
                </div>
                <p className="text-sm text-green-800 mt-2">
                  You can now offer services on MapAble. Your provider profile
                  is active and ready to receive bookings.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
