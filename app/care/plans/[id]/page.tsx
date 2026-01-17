"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  FileText,
  Calendar,
  User,
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface CarePlan {
  id: string;
  planName: string;
  status: string;
  startDate: string;
  reviewDate: string;
  goals: Array<{
    description: string;
    targetDate: string;
    status?: string;
    progress?: number;
  }>;
  services: Record<string, unknown>;
  participant: {
    id: string;
    name: string;
    email: string;
    ndisPlan?: {
      id: string;
      planNumber: string;
      status: string;
      totalBudget: number;
      remainingBudget: number;
    };
  };
  worker?: {
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  notes: Array<{
    id: string;
    noteType: string;
    content: string;
    createdAt: string;
  }>;
}

export default function CarePlanDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [loading, setLoading] = useState(true);

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

  const getGoalStatusBadge = (status?: string) => {
    if (status === "ACHIEVED") {
      return <Badge className="bg-green-100 text-green-800">Achieved</Badge>;
    } else if (status === "ON_HOLD") {
      return <Badge variant="secondary">On Hold</Badge>;
    }
    return <Badge>Active</Badge>;
  };

  const isGoalOverdue = (targetDate: string) => {
    return new Date(targetDate) < new Date();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">{carePlan.planName}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge>{carePlan.status}</Badge>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/care/plans/${params.id}/goals`}>
                <Target className="h-4 w-4 mr-2" />
                Track Goals
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Plan Details */}
            <div>
              <h3 className="font-semibold mb-3">Plan Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Participant:</span>
                  <span>
                    {carePlan.participant.name || carePlan.participant.email}
                  </span>
                </div>
                {carePlan.worker && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Worker:</span>
                    <span>
                      {carePlan.worker.user.name || carePlan.worker.user.email}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Start Date:</span>
                  <span>{new Date(carePlan.startDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Review Date:</span>
                  <span>{new Date(carePlan.reviewDate).toLocaleDateString()}</span>
                </div>
                {carePlan.participant.ndisPlan && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      NDIS Plan: {carePlan.participant.ndisPlan.planNumber}
                    </p>
                    <p className="text-xs text-blue-700">
                      Budget: ${carePlan.participant.ndisPlan.remainingBudget.toFixed(
                        2
                      )}{" "}
                      remaining of ${carePlan.participant.ndisPlan.totalBudget.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Goals */}
            <div>
              <h3 className="font-semibold mb-3">Goals</h3>
              <div className="space-y-3">
                {carePlan.goals.map((goal, index) => {
                  const overdue = isGoalOverdue(goal.targetDate);
                  return (
                    <div
                      key={index}
                      className="border rounded-lg p-4 bg-muted/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium">{goal.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getGoalStatusBadge(goal.status)}
                            {overdue && goal.status === "ACTIVE" && (
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span>
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                        {goal.progress !== undefined && (
                          <div className="flex-1">
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${goal.progress}%` }}
                              />
                            </div>
                            <span className="mt-1">{goal.progress}% complete</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Notes */}
            {carePlan.notes && carePlan.notes.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Recent Notes</h3>
                <div className="space-y-2">
                  {carePlan.notes.map((note) => (
                    <div key={note.id} className="border rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline">{note.noteType}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{note.content}</p>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="mt-3" asChild>
                  <Link href={`/care/notes?carePlanId=${carePlan.id}`}>
                    View All Notes
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
