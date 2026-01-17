"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Briefcase, Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface JobApplication {
  id: string;
  job: {
    id: string;
    title: string;
    jobNumber: string;
  };
  status: string;
  appliedAt: string;
}

export default function JobApplicationsPage() {
  const { data: session } = useSession();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetchApplications();
    }
  }, [session]);

  const fetchApplications = async () => {
    try {
      const response = await fetch(
        `/api/jobs/applications?applicantId=${session?.user?.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      APPLIED: "secondary",
      REVIEWING: "default",
      INTERVIEW: "default",
      OFFER: "default",
      REJECTED: "destructive",
    };

    const icons: Record<string, any> = {
      APPLIED: Clock,
      REVIEWING: Clock,
      INTERVIEW: CheckCircle2,
      OFFER: CheckCircle2,
      REJECTED: XCircle,
    };

    const Icon = icons[status] || Clock;

    return (
      <Badge variant={variants[status] || "outline"}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My Applications</h1>
        <p className="text-muted-foreground">
          Track your job applications and their status
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No applications found.</p>
            <Button asChild className="mt-4">
              <Link href="/jobs/board">Browse Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <Card key={application.id} variant="interactive">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">
                        {application.job.title}
                      </CardTitle>
                      {getStatusBadge(application.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Job #{application.job.jobNumber}</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Applied: {new Date(application.appliedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/jobs/${application.job.id}`}>View Job</Link>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
