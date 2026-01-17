"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Briefcase, MapPin, DollarSign, Filter, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface JobListing {
  id: string;
  jobNumber: string;
  title: string;
  description: string;
  location: {
    address: string;
    city: string;
    state: string;
  };
  jobType: string;
  category: string;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  accessibilityRequirements: string[];
  applicationDeadline?: string;
}

export default function JobBoardPage() {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: "",
    jobType: "",
    location: "",
    search: "",
  });

  useEffect(() => {
    fetchJobs();
  }, [filters]);

  const fetchJobs = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append("category", filters.category);
      if (filters.jobType) params.append("jobType", filters.jobType);
      if (filters.location) params.append("location", filters.location);
      if (filters.search) params.append("search", filters.search);

      const response = await fetch(`/api/jobs/listings?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Job Board</h1>
          <p className="text-muted-foreground">
            Find accessible employment opportunities
          </p>
        </div>
        <Button asChild>
          <Link href="/jobs/post">Post a Job</Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, category: e.target.value }))
              }
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Categories</option>
              <option value="Administration">Administration</option>
              <option value="Customer Service">Customer Service</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Retail">Retail</option>
              <option value="Hospitality">Hospitality</option>
              <option value="Other">Other</option>
            </select>
            <select
              value={filters.jobType}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, jobType: e.target.value }))
              }
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Casual">Casual</option>
              <option value="Contract">Contract</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No jobs found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id} variant="interactive">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                      <Badge variant="outline">{job.jobType}</Badge>
                      <Badge variant="outline">{job.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {job.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>
                          {job.location.city}, {job.location.state}
                        </span>
                      </div>
                      {job.salaryRange && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          <span>
                            ${job.salaryRange.min.toLocaleString()} - $
                            {job.salaryRange.max.toLocaleString()}{" "}
                            {job.salaryRange.currency}
                          </span>
                        </div>
                      )}
                      {job.applicationDeadline && (
                        <span>
                          Closes:{" "}
                          {new Date(job.applicationDeadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {job.accessibilityRequirements.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {job.accessibilityRequirements.map((req) => (
                          <Badge key={req} variant="outline" className="text-xs">
                            {req}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/jobs/${job.id}`}>View</Link>
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
