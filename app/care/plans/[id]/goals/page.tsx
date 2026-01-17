"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Target, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Goal {
  description: string;
  targetDate: string;
  status?: string;
  progress?: number;
}

interface CarePlan {
  id: string;
  planName: string;
  goals: Goal[];
}

export default function GoalTrackingPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchCarePlan();
    }
  }, [params.id]);

  const fetchCarePlan = async () => {
    try {
      const response = await fetch(`/api/care/plans/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setCarePlan(data);
      }
    } catch (error) {
      console.error("Error fetching care plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateGoalProgress = async (
    goalIndex: number,
    progress: number,
    status?: string
  ) => {
    if (!carePlan) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/care/plans/${params.id}/goals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalIndex,
          progress,
          status: status || (progress >= 100 ? "ACHIEVED" : "ACTIVE"),
        }),
      });

      if (response.ok) {
        await fetchCarePlan();
      }
    } catch (error) {
      console.error("Error updating goal:", error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!carePlan) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Care plan not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Goal Tracking - {carePlan.planName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {carePlan.goals.map((goal, index) => {
              const overdue =
                new Date(goal.targetDate) < new Date() &&
                goal.status === "ACTIVE";
              const progress = goal.progress || 0;

              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{goal.description}</h4>
                      <div className="flex items-center gap-2">
                        {goal.status === "ACHIEVED" ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Achieved
                          </Badge>
                        ) : goal.status === "ON_HOLD" ? (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            On Hold
                          </Badge>
                        ) : (
                          <Badge>Active</Badge>
                        )}
                        {overdue && (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm text-muted-foreground">
                          {progress}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div
                          className="bg-green-600 h-3 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {[0, 25, 50, 75, 100].map((value) => (
                        <Button
                          key={value}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateGoalProgress(
                              index,
                              value,
                              value === 100 ? "ACHIEVED" : undefined
                            )
                          }
                          disabled={updating}
                        >
                          {value}%
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
