"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, AlertTriangle, Filter, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Risk {
  id: string;
  title: string;
  description: string;
  riskLevel: string;
  status: string;
  category: string;
  identifiedAt: string;
  participant?: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    mitigations: number;
  };
}

export default function RiskRegisterPage() {
  const { data: session } = useSession();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    riskLevel: "",
    status: "",
    category: "",
    search: "",
  });

  useEffect(() => {
    fetchRisks();
  }, [filters]);

  const fetchRisks = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.riskLevel) params.append("riskLevel", filters.riskLevel);
      if (filters.status) params.append("status", filters.status);
      if (filters.category) params.append("category", filters.category);

      const response = await fetch(`/api/compliance/risks?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRisks(data.risks || []);
      }
    } catch (error) {
      console.error("Error fetching risks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      CRITICAL: "bg-red-100 text-red-800",
      HIGH: "bg-orange-100 text-orange-800",
      MEDIUM: "bg-yellow-100 text-yellow-800",
      LOW: "bg-green-100 text-green-800",
    };

    return (
      <Badge className={colors[level] || "bg-gray-100 text-gray-800"}>
        {level}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      IDENTIFIED: "secondary",
      ASSESSED: "default",
      MITIGATED: "default",
      MONITORED: "default",
      CLOSED: "outline",
    };

    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Risk Register</h1>
          <p className="text-muted-foreground">
            Identify, assess, and manage risks
          </p>
        </div>
        <Button asChild>
          <Link href="/compliance/risks/create">
            <Plus className="h-4 w-4 mr-2" />
            New Risk
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
                placeholder="Search risks..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <select
              value={filters.riskLevel}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, riskLevel: e.target.value }))
              }
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Levels</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Statuses</option>
              <option value="IDENTIFIED">Identified</option>
              <option value="ASSESSED">Assessed</option>
              <option value="MITIGATED">Mitigated</option>
              <option value="MONITORED">Monitored</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Risks List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading risks...</p>
        </div>
      ) : risks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No risks found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {risks.map((risk) => (
            <Card key={risk.id} variant="interactive">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <CardTitle className="text-lg">{risk.title}</CardTitle>
                      {getLevelBadge(risk.riskLevel)}
                      {getStatusBadge(risk.status)}
                      <Badge variant="outline">{risk.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {risk.description.substring(0, 200)}
                      {risk.description.length > 200 ? "..." : ""}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Identified: {new Date(risk.identifiedAt).toLocaleDateString()}
                      </span>
                      {risk.participant && (
                        <span>Participant: {risk.participant.name}</span>
                      )}
                      <span>
                        {risk._count.mitigations} mitigation
                        {risk._count.mitigations !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/compliance/risks/${risk.id}`}>View</Link>
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
