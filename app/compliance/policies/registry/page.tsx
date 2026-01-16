"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Search, Filter, CheckCircle2, Clock, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Policy {
  id: string;
  title: string;
  category: string;
  version: string;
  status: string;
  effectiveDate: string;
  reviewDate?: string | null;
  _count: {
    acknowledgments: number;
    assignedUsers: number;
  };
}

export default function PolicyRegistryPage() {
  const { data: session } = useSession();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    search: "",
  });

  useEffect(() => {
    fetchPolicies();
  }, [filters]);

  const fetchPolicies = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append("category", filters.category);
      if (filters.status) params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);

      const response = await fetch(
        `/api/compliance/policies?${params.toString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setPolicies(data.policies || []);
      }
    } catch (error) {
      console.error("Error fetching policies:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      ACTIVE: "default",
      DRAFT: "secondary",
      ARCHIVED: "outline",
      UNDER_REVIEW: "secondary",
    };

    return (
      <Badge variant={variants[status] || "outline"}>{status}</Badge>
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      CORE: "bg-blue-100 text-blue-800",
      CARE: "bg-pink-100 text-pink-800",
      TRANSPORT: "bg-green-100 text-green-800",
      WORKFORCE: "bg-purple-100 text-purple-800",
      PRIVACY: "bg-gray-100 text-gray-800",
      WHS: "bg-red-100 text-red-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Policy Registry</h1>
          <p className="text-muted-foreground">
            Manage and track policy acknowledgments
          </p>
        </div>
        <Button asChild>
          <Link href="/compliance/policies/create">
            <Plus className="h-4 w-4 mr-2" />
            New Policy
          </Link>
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
                placeholder="Search policies..."
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
              <option value="CORE">Core</option>
              <option value="CARE">Care</option>
              <option value="TRANSPORT">Transport</option>
              <option value="WORKFORCE">Workforce</option>
              <option value="PRIVACY">Privacy</option>
              <option value="WHS">WHS</option>
              <option value="OTHER">Other</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Policies List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading policies...</p>
        </div>
      ) : policies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No policies found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {policies.map((policy) => {
            const acknowledgmentRate =
              policy._count.assignedUsers > 0
                ? (policy._count.acknowledgments /
                    policy._count.assignedUsers) *
                  100
                : 0;

            return (
              <Card key={policy.id} variant="interactive">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>{policy.title}</CardTitle>
                        {getStatusBadge(policy.status)}
                        <Badge
                          variant="outline"
                          className={getCategoryColor(policy.category)}
                        >
                          {policy.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Version {policy.version} • Effective:{" "}
                        {new Date(policy.effectiveDate).toLocaleDateString()}
                        {policy.reviewDate &&
                          ` • Review: ${new Date(policy.reviewDate).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Button variant="outline" asChild>
                      <Link href={`/compliance/policies/${policy.id}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>
                        {policy._count.acknowledgments} /{" "}
                        {policy._count.assignedUsers} Acknowledged
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${acknowledgmentRate}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-muted-foreground">
                      {acknowledgmentRate.toFixed(0)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
