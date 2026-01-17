"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface JobListing {
  id: string;
  jobNumber: string;
  title: string;
  description: string;
  location: {
    address: string;
    city: string;
    state: string;
    postcode: string;
  };
  jobType: string;
  category: string;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  accessibilityRequirements: string[];
  requiredSkills: string[];
  preferredSkills?: string[];
  applicationDeadline?: string;
}

export default function JobDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<JobListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchJob();
      checkApplication();
    }
  }, [params.id]);

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/jobs/listings/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setJob(data);
      }
    } catch (error) {
      console.error("Error fetching job:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkApplication = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(
        `/api/jobs/applications?applicantId=${session.user.id}&jobId=${params.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setHasApplied(data.applications?.length > 0);
      }
    } catch (error) {
      console.error("Error checking application:", error);
    }
  };

  const handleApply = async () => {
    if (!session?.user?.id || !job) return;

    setApplying(true);
    try {
      const response = await fetch("/api/jobs/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          applicantId: session.user.id,
        }),
      });

      if (response.ok) {
        setHasApplied(true);
        router.push(`/jobs/applications`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to apply");
      }
    } catch (error) {
      console.error("Error applying:", error);
      alert("Failed to apply");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Job not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">{job.title}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{job.jobType}</Badge>
                <Badge variant="outline">{job.category}</Badge>
                <span className="text-sm text-muted-foreground">
                  {job.jobNumber}
                </span>
              </div>
            </div>
            {!hasApplied && (
              <Button onClick={handleApply} disabled={applying}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {applying ? "Applying..." : "Apply Now"}
              </Button>
            )}
            {hasApplied && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Applied
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Job Details */}
            <div>
              <h3 className="font-semibold mb-3">Job Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {job.location.address}, {job.location.city},{" "}
                    {job.location.state} {job.location.postcode}
                  </span>
                </div>
                {job.salaryRange && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>
                      ${job.salaryRange.min.toLocaleString()} - $
                      {job.salaryRange.max.toLocaleString()}{" "}
                      {job.salaryRange.currency}
                    </span>
                  </div>
                )}
                {job.applicationDeadline && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Application Deadline:{" "}
                      {new Date(job.applicationDeadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded">
                {job.description}
              </p>
            </div>

            {/* Required Skills */}
            <div>
              <h3 className="font-semibold mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((skill) => (
                  <Badge key={skill} variant="default">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Preferred Skills */}
            {job.preferredSkills && job.preferredSkills.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Preferred Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.preferredSkills.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Accessibility Requirements */}
            {job.accessibilityRequirements.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">
                  Accessibility Features
                </h3>
                <div className="flex flex-wrap gap-2">
                  {job.accessibilityRequirements.map((req) => (
                    <Badge key={req} className="bg-green-100 text-green-800">
                      {req}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
