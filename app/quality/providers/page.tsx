"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { TrendingUp, Award, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProviderScore {
  providerId: string;
  overallScore: number;
  categoryScores: {
    serviceQuality: number;
    participantSatisfaction: number;
    compliance: number;
    timeliness: number;
    communication: number;
  };
  rating: string;
}

export default function ProviderQualityPage() {
  const { data: session } = useSession();
  const [providers, setProviders] = useState<ProviderScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProviderScores();
  }, []);

  const fetchProviderScores = async () => {
    try {
      // TODO: Fetch all provider scores
      // For now, return empty array
      setProviders([]);
    } catch (error) {
      console.error("Error fetching provider scores:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRatingBadge = (rating: string) => {
    const colors: Record<string, string> = {
      Excellent: "bg-green-100 text-green-800",
      Good: "bg-blue-100 text-blue-800",
      Satisfactory: "bg-yellow-100 text-yellow-800",
      "Needs Improvement": "bg-red-100 text-red-800",
    };

    return (
      <Badge className={colors[rating] || "bg-gray-100 text-gray-800"}>
        {rating}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Provider Quality Scores</h1>
        <p className="text-muted-foreground">
          Performance ratings and quality metrics for providers
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading provider scores...</p>
        </div>
      ) : providers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No provider scores available.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {providers.map((provider) => (
            <Card key={provider.providerId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Provider {provider.providerId.substring(0, 8)}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">
                      {provider.overallScore}
                    </span>
                    <span className="text-muted-foreground">/100</span>
                    {getRatingBadge(provider.rating)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Service Quality
                    </p>
                    <p className="font-semibold">
                      {provider.categoryScores.serviceQuality}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Satisfaction
                    </p>
                    <p className="font-semibold">
                      {provider.categoryScores.participantSatisfaction}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Compliance
                    </p>
                    <p className="font-semibold">
                      {provider.categoryScores.compliance}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Timeliness
                    </p>
                    <p className="font-semibold">
                      {provider.categoryScores.timeliness}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Communication
                    </p>
                    <p className="font-semibold">
                      {provider.categoryScores.communication}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
