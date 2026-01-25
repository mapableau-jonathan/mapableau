"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Campaign {
  id: string;
  name: string;
  status: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

interface AdvertiserData {
  id: string;
  balance: number;
  totalSpent: number;
  creditLimit: number;
}

interface PerformanceData {
  advertiser: AdvertiserData;
  period: {
    start: string;
    end: string;
  };
  spend: {
    totalSpend: number;
    campaignBreakdown: Array<{
      campaignId: string;
      campaignName: string;
      spend: number;
      impressions: number;
      clicks: number;
    }>;
  };
  campaignPerformance: Campaign[];
}

interface AnalyticsData {
  summary: {
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalSpend: number;
    ctr: number;
    cpc: number;
    cpm: number;
    conversionRate: number;
    roas: number;
  };
  campaignPerformance: Array<{
    campaignId: string;
    campaignName: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    ctr: number;
    cpc: number;
    cpm: number;
    conversionRate: number;
  }>;
  adPerformance: Array<{
    adId: string;
    adTitle: string;
    impressions: number;
    clicks: number;
    spend: number;
    ctr: number;
  }>;
  timeSeries: Array<{
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
  }>;
  categoryPerformance: Array<{
    category: string;
    impressions: number;
    clicks: number;
    spend: number;
  }>;
}

interface CampaignDashboardProps {
  advertiserId?: string;
}

export function CampaignDashboard({ advertiserId }: CampaignDashboardProps) {
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "campaigns" | "analytics">("overview");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch advertiser account first
      const advertiserRes = await fetch("/api/advertisers");
      if (!advertiserRes.ok) {
        throw new Error("Failed to fetch advertiser account");
      }
      const advertiserData = await advertiserRes.json();
      const advId = advertiserId || advertiserData.id;

      // Fetch performance data
      const perfRes = await fetch(
        `/api/advertisers/performance?advertiserId=${advId}`
      );
      if (!perfRes.ok) {
        throw new Error("Failed to fetch performance");
      }
      const perfData = await perfRes.json();
      setPerformance(perfData);

      // Fetch analytics
      const analyticsRes = await fetch(
        `/api/advertisers/analytics?advertiserId=${advId}`
      );
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }

      // Fetch campaigns
      const campaignsRes = await fetch(
        `/api/advertisers/campaigns?advertiserId=${advId}`
      );
      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData.campaigns || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-AU").format(num);
  };

  const formatPercentage = (num: number) => {
    return `${(num * 100).toFixed(2)}%`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      ACTIVE: "default",
      PAUSED: "secondary",
      DRAFT: "outline",
      COMPLETED: "secondary",
      CANCELLED: "destructive",
    };
    return (
      <Badge variant={variants[status] || "outline"}>{status}</Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading campaign data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchData} variant="outline" className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!performance) {
    return null;
  }

  const { advertiser, campaignPerformance } = performance;
  const summary = analytics?.summary || {
    totalImpressions: campaignPerformance.reduce((sum, c) => sum + c.impressions, 0),
    totalClicks: campaignPerformance.reduce((sum, c) => sum + c.clicks, 0),
    totalConversions: campaignPerformance.reduce((sum, c) => sum + c.conversions, 0),
    totalSpend: campaignPerformance.reduce((sum, c) => sum + c.spend, 0),
    ctr: 0,
    cpc: 0,
    cpm: 0,
    conversionRate: 0,
    roas: 0,
  };

  // Calculate metrics if not provided
  if (summary.ctr === 0 && summary.totalImpressions > 0) {
    summary.ctr = summary.totalClicks / summary.totalImpressions;
  }
  if (summary.cpc === 0 && summary.totalClicks > 0) {
    summary.cpc = summary.totalSpend / summary.totalClicks;
  }
  if (summary.cpm === 0 && summary.totalImpressions > 0) {
    summary.cpm = (summary.totalSpend / summary.totalImpressions) * 1000;
  }
  if (summary.conversionRate === 0 && summary.totalClicks > 0) {
    summary.conversionRate = summary.totalConversions / summary.totalClicks;
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "campaigns"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Campaigns
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "analytics"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Account Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(advertiser.balance)}</div>
                <p className="text-xs text-muted-foreground">
                  Credit limit: {formatCurrency(advertiser.creditLimit)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(advertiser.totalSpent)}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Credit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(advertiser.creditLimit - advertiser.totalSpent)}
                </div>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Impressions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(summary.totalImpressions)}</div>
                <p className="text-xs text-muted-foreground">Total views</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clicks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(summary.totalClicks)}</div>
                <p className="text-xs text-muted-foreground">
                  CTR: {formatPercentage(summary.ctr)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPC</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.cpc)}</div>
                <p className="text-xs text-muted-foreground">Cost per click</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPM</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.cpm)}</div>
                <p className="text-xs text-muted-foreground">Cost per 1000 impressions</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Campaigns</CardTitle>
              <CardDescription>Your active and recent campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {campaignPerformance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No campaigns found
                </p>
              ) : (
                <div className="space-y-4">
                  {campaignPerformance.slice(0, 5).map((campaign) => (
                    <div
                      key={campaign.campaignId}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{campaign.campaignName}</p>
                          {getStatusBadge(campaign.status)}
                        </div>
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                          <span>{formatNumber(campaign.impressions)} impressions</span>
                          <span>{formatNumber(campaign.clicks)} clicks</span>
                          <span>CTR: {formatPercentage(campaign.ctr)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatCurrency(campaign.spend)}</p>
                        <p className="text-xs text-muted-foreground">
                          CPC: {formatCurrency(campaign.cpc)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Campaigns Tab */}
      {activeTab === "campaigns" && (
        <Card>
          <CardHeader>
            <CardTitle>All Campaigns</CardTitle>
            <CardDescription>Manage and monitor your advertising campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            {campaignPerformance.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">No campaigns found</p>
                <Button variant="outline">Create Campaign</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {campaignPerformance.map((campaign) => (
                  <div
                    key={campaign.campaignId}
                    className="p-6 rounded-lg border hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{campaign.campaignName}</h3>
                          {getStatusBadge(campaign.status)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{formatCurrency(campaign.spend)}</p>
                        <p className="text-sm text-muted-foreground">Total spend</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Impressions</p>
                        <p className="text-lg font-semibold">{formatNumber(campaign.impressions)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Clicks</p>
                        <p className="text-lg font-semibold">{formatNumber(campaign.clicks)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">CTR</p>
                        <p className="text-lg font-semibold">{formatPercentage(campaign.ctr)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">CPC</p>
                        <p className="text-lg font-semibold">{formatCurrency(campaign.cpc)}</p>
                      </div>
                    </div>

                    {campaign.conversions > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Conversions: {formatNumber(campaign.conversions)} (
                          {formatPercentage(campaign.conversionRate || 0)})
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && analytics && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
              <CardDescription>Overall campaign performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Impressions</p>
                  <p className="text-2xl font-bold">{formatNumber(analytics.summary.totalImpressions)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Clicks</p>
                  <p className="text-2xl font-bold">{formatNumber(analytics.summary.totalClicks)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spend</p>
                  <p className="text-2xl font-bold">{formatCurrency(analytics.summary.totalSpend)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ROAS</p>
                  <p className="text-2xl font-bold">{analytics.summary.roas.toFixed(2)}x</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {analytics.adPerformance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Ads</CardTitle>
                <CardDescription>Best performing advertisements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.adPerformance.slice(0, 10).map((ad) => (
                    <div
                      key={ad.adId}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{ad.adTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(ad.impressions)} impressions • {formatNumber(ad.clicks)} clicks • CTR: {formatPercentage(ad.ctr)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatCurrency(ad.spend)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
