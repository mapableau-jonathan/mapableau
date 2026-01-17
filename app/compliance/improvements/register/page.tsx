"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, TrendingUp, Filter, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Improvement {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  identifiedAt: string;
  owner?: string;
}

export default function ImprovementRegisterPage() {
  const { data: session } = useSession();
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    category: "",
  });

  useEffect(() => {
    fetchImprovements();
  }, [filters]);

  const fetchImprovements = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.priority) params.append("priority", filters.priority);
      if (filters.category) params.append("category", filters.category);

      const response = await fetch(
        `/api/compliance/improvements?${params.toString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setImprovements(data.improvements || []);
      }
    } catch (error) {
      console.error("Error fetching improvements:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      CRITICAL: "bg-red-100 text-red-800",
      HIGH: "bg-orange-100 text-orange-800",
      MEDIUM: "bg-yellow-100 text-yellow-800",
      LOW: "bg-green-100 text-green-800",
    };

    return (
      <Badge className={colors[priority] || "bg-gray-100 text-gray-800"}>
        {priority}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      IDENTIFIED: "secondary",
      PLANNED: "default",
      IN_PROGRESS: "default",
      IMPLEMENTED: "default",
      CLOSED: "outline",
    };

    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Continuous Improvement Register</h1>
          <p className="text-muted-foreground">
            Track improvements and action items
          </p>
        </div>
        <Button asChild>
          <Link href="/compliance/improvements/create">
            <Plus className="h-4 w-4 mr-2" />
            New Improvement
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Statuses</option>
              <option value="IDENTIFIED">Identified</option>
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IMPLEMENTED">Implemented</option>
              <option value="CLOSED">Closed</option>
            </select>
            <select
              value={filters.priority}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, priority: e.target.value }))
              }
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Improvements List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading improvements...</p>
        </div>
      ) : improvements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No improvements found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {improvements.map((improvement) => (
            <Card key={improvement.id} variant="interactive">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{improvement.title}</CardTitle>
                      {getPriorityBadge(improvement.priority)}
                      {getStatusBadge(improvement.status)}
                      <Badge variant="outline">{improvement.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {improvement.description.substring(0, 200)}
                      {improvement.description.length > 200 ? "..." : ""}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Identified: {new Date(improvement.identifiedAt).toLocaleDateString()}
                      </span>
                      {improvement.owner && (
                        <span>Owner: {improvement.owner}</span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/compliance/improvements/${improvement.id}`}>
                      View
                    </Link>
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
