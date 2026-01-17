"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  Target,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QualityMetrics {
  serviceDeliveryKPIs: {
    completionRate: number;
    totalServices: number;
  };
  participantSatisfaction: {
    avgRating: number;
    totalRatings: number;
  };
  providerPerformance: {
    avgProviderScore: number;
    activeProviders: number;
  };
  incidentTrends: {
    totalIncidents: number;
    seriousIncidents: number;
  };
  complaintTrends: {
    resolutionRate: number;
    totalComplaints: number;
  };
  carePlanMetrics: {
    avgGoalAchievementRate: number;
    activeCarePlans: number;
  };
  workerCompliance: {
    complianceRate: number;
    verifiedWorkers: number;
  };
}

export default function QualityDashboardPage() {
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  const fetchMetrics = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      const response = await fetch(
        `/api/quality/metrics?${params.toString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error("Error fetching quality metrics:", error);
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

  if (!metrics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>No metrics available</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quality Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive quality metrics and insights
          </p>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
                className="px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
                className="px-4 py-2 border rounded-lg"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Service Completion
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.serviceDeliveryKPIs.completionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.serviceDeliveryKPIs.completedServices} of{" "}
              {metrics.serviceDeliveryKPIs.totalServices} services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Participant Satisfaction
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.participantSatisfaction.avgRating.toFixed(1)}/5
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {metrics.participantSatisfaction.totalRatings} ratings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Provider Performance
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.providerPerformance.avgProviderScore}/100
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.providerPerformance.activeProviders} active providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Goal Achievement
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.carePlanMetrics.avgGoalAchievementRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.carePlanMetrics.activeCarePlans} active care plans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Incident Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Incidents</span>
                <span className="font-semibold">
                  {metrics.incidentTrends.totalIncidents}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-600">Serious Incidents</span>
                <Badge variant="destructive">
                  {metrics.incidentTrends.seriousIncidents}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Complaint Resolution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Resolution Rate</span>
                <span className="font-semibold">
                  {metrics.complaintTrends.resolutionRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Complaints</span>
                <span className="font-semibold">
                  {metrics.complaintTrends.totalComplaints}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Worker Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>Worker Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm">Compliance Rate</span>
            <span className="text-2xl font-bold">
              {metrics.workerCompliance.complianceRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {metrics.workerCompliance.verifiedWorkers} of{" "}
            {metrics.workerCompliance.verifiedWorkers} workers verified
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
