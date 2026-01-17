"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, FileText, Calendar, User } from "lucide-react";
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
  participant: {
    id: string;
    name: string;
    email: string;
  };
  worker?: {
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  _count: {
    notes: number;
  };
}

export default function CarePlansPage() {
  const { data: session } = useSession();
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCarePlans();
  }, []);

  const fetchCarePlans = async () => {
    try {
      const response = await fetch("/api/care/plans");
      if (response.ok) {
        const data = await response.json();
        setCarePlans(data.carePlans || []);
      }
    } catch (error) {
      console.error("Error fetching care plans:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Care Plans</h1>
          <p className="text-muted-foreground">
            Manage personalized care plans and track goals
          </p>
        </div>
        <Button asChild>
          <Link href="/care/plans/builder">
            <Plus className="h-4 w-4 mr-2" />
            New Care Plan
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading care plans...</p>
        </div>
      ) : carePlans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No care plans found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {carePlans.map((plan) => (
            <Card key={plan.id} variant="interactive">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{plan.planName}</CardTitle>
                      <Badge>{plan.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>
                          {plan.participant.name || plan.participant.email}
                        </span>
                      </div>
                      {plan.worker && (
                        <div className="flex items-center gap-2">
                          <span>Worker: {plan.worker.user.name || plan.worker.user.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Review: {new Date(plan.reviewDate).toLocaleDateString()}
                        </span>
                      </div>
                      <span>{plan._count.notes} notes</span>
                    </div>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/care/plans/${plan.id}`}>View</Link>
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
