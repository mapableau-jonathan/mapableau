"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EarningsSummary {
  totalEarnings: number;
  paidEarnings: number;
  unpaidEarnings: number;
  paymentThreshold: number;
  canRequestPayout: boolean;
  nextPaymentDate?: string;
}

interface EarningsData {
  summary: EarningsSummary;
  period: {
    start: string;
    end: string;
  };
  earnings: {
    totalRevenue: number;
    publisherEarnings: number;
    platformCommission: number;
    adUnitBreakdown: Array<{
      adUnitId: string;
      adUnitName: string;
      revenue: number;
      earnings: number;
    }>;
  };
}

interface EarningsDashboardProps {
  publisherId?: string;
}

export function EarningsDashboard({ publisherId }: EarningsDashboardProps) {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestingPayout, setRequestingPayout] = useState(false);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/publishers/earnings");
      if (!response.ok) {
        throw new Error("Failed to fetch earnings");
      }
      const data = await response.json();
      setEarnings(data);
    } catch (err: any) {
      setError(err.message || "Failed to load earnings");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!earnings?.summary.canRequestPayout) {
      return;
    }

    try {
      setRequestingPayout(true);
      const response = await fetch("/api/publishers/payout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: earnings.summary.unpaidEarnings,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to request payout");
      }

      const result = await response.json();
      alert(result.message || "Payout request submitted successfully");
      await fetchEarnings(); // Refresh earnings
    } catch (err: any) {
      alert(err.message || "Failed to request payout");
    } finally {
      setRequestingPayout(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading earnings data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchEarnings} variant="outline" className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!earnings) {
    return null;
  }

  const { summary, earnings: earningsData } = earnings;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.unpaidEarnings)}</div>
            <p className="text-xs text-muted-foreground">
              Threshold: {formatCurrency(summary.paymentThreshold)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.paidEarnings)}</div>
            <p className="text-xs text-muted-foreground">Total paid out</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Period Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(earningsData.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {formatDate(earnings.period.start)} - {formatDate(earnings.period.end)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Section */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Request</CardTitle>
          <CardDescription>
            Request a payout when you reach the minimum threshold
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Available for Payout</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.unpaidEarnings)}</p>
            </div>
            <div className="text-right">
              {summary.nextPaymentDate && (
                <p className="text-sm text-muted-foreground">
                  Next payment: {formatDate(summary.nextPaymentDate)}
                </p>
              )}
            </div>
          </div>

          {summary.canRequestPayout ? (
            <Button
              onClick={handleRequestPayout}
              disabled={requestingPayout}
              className="w-full"
            >
              {requestingPayout ? "Processing..." : "Request Payout"}
            </Button>
          ) : (
            <div className="rounded-lg border p-4 bg-muted">
              <p className="text-sm text-muted-foreground">
                You need {formatCurrency(summary.paymentThreshold - summary.unpaidEarnings)} more
                to reach the payout threshold.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
          <CardDescription>Earnings by ad unit for the current period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Total Revenue</p>
                <p className="text-sm text-muted-foreground">Before revenue share</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatCurrency(earningsData.totalRevenue)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Your Earnings (70%)</p>
                <p className="text-sm text-muted-foreground">Publisher share</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(earningsData.publisherEarnings)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Platform Commission (30%)</p>
                <p className="text-sm text-muted-foreground">MapAble share</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatCurrency(earningsData.platformCommission)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ad Unit Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Ad Unit Performance</CardTitle>
          <CardDescription>Revenue breakdown by ad unit</CardDescription>
        </CardHeader>
        <CardContent>
          {earningsData.adUnitBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No ad units with revenue in this period
            </p>
          ) : (
            <div className="space-y-2">
              {earningsData.adUnitBreakdown.map((unit) => (
                <div
                  key={unit.adUnitId}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex-1">
                    <p className="font-medium">{unit.adUnitName}</p>
                    <p className="text-sm text-muted-foreground">
                      Revenue: {formatCurrency(unit.revenue)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(unit.earnings)}</p>
                    <Badge variant="secondary" className="mt-1">
                      {(unit.revenue > 0
                        ? (unit.earnings / unit.revenue) * 100
                        : 0
                      ).toFixed(1)}
                      %
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
