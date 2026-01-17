"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, GraduationCap, Filter, Search, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface TrainingRecord {
  id: string;
  trainingType: string;
  trainingName: string;
  provider?: string;
  completedAt: string;
  expiryDate?: string;
  certificateNumber?: string;
  competencyLevel?: string;
  worker: {
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export default function TrainingRegisterPage() {
  const { data: session } = useSession();
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    trainingType: "",
    competencyLevel: "",
    search: "",
  });

  useEffect(() => {
    fetchRecords();
  }, [filters]);

  const fetchRecords = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.trainingType) params.append("trainingType", filters.trainingType);
      if (filters.competencyLevel)
        params.append("competencyLevel", filters.competencyLevel);

      const response = await fetch(`/api/compliance/training?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error("Error fetching training records:", error);
    } finally {
      setLoading(false);
    }
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const isExpiringSoon = (expiryDate?: string, days: number = 30) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const future = new Date();
    future.setDate(future.getDate() + days);
    return expiry <= future && expiry > new Date();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Training Register</h1>
          <p className="text-muted-foreground">
            Track worker training and competency records
          </p>
        </div>
        <Button asChild>
          <Link href="/compliance/training/create">
            <Plus className="h-4 w-4 mr-2" />
            New Training Record
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
                placeholder="Search training records..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <select
              value={filters.trainingType}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, trainingType: e.target.value }))
              }
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Types</option>
              <option value="Induction">Induction</option>
              <option value="Mandatory">Mandatory</option>
              <option value="Skills">Skills</option>
              <option value="First Aid">First Aid</option>
              <option value="NDIS">NDIS</option>
            </select>
            <select
              value={filters.competencyLevel}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  competencyLevel: e.target.value,
                }))
              }
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Training Records List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading training records...</p>
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No training records found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map((record) => {
            const expired = isExpired(record.expiryDate);
            const expiringSoon = isExpiringSoon(record.expiryDate);

            return (
              <Card key={record.id} variant="interactive">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <GraduationCap className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">
                          {record.trainingName}
                        </CardTitle>
                        <Badge variant="outline">{record.trainingType}</Badge>
                        {record.competencyLevel && (
                          <Badge>{record.competencyLevel}</Badge>
                        )}
                        {expired && (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Expired
                          </Badge>
                        )}
                        {expiringSoon && !expired && (
                          <Badge variant="secondary">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Expiring Soon
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          Worker: {record.worker.user.name || record.worker.user.email}
                        </span>
                        <span>
                          Completed: {new Date(record.completedAt).toLocaleDateString()}
                        </span>
                        {record.expiryDate && (
                          <span>
                            Expires: {new Date(record.expiryDate).toLocaleDateString()}
                          </span>
                        )}
                        {record.provider && <span>Provider: {record.provider}</span>}
                      </div>
                    </div>
                    <Button variant="outline" asChild>
                      <Link href={`/compliance/training/${record.id}`}>View</Link>
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
