/**
 * Plan Manager Dashboard
 * Multi-participant plan management, budget allocation, and spending analytics
 */

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface ManagedPlan {
  id: string;
  planNumber: string;
  participant: {
    name: string;
    email: string;
  };
  status: string;
  totalBudget: number;
  remainingBudget: number;
  categories: Array<{
    id: string;
    categoryCode: string;
    allocatedAmount: number;
    spentAmount: number;
    remainingAmount: number;
  }>;
}

export default function PlanManagerDashboard() {
  const { data: session } = useSession();
  const [plans, setPlans] = useState<ManagedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<ManagedPlan | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchPlans();
    }
  }, [session]);

  const fetchPlans = async () => {
    try {
      // In a real implementation, this would fetch plans managed by the current user
      // For now, we'll show a placeholder
      setPlans([]);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Plan Manager Dashboard</h1>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Plans</p>
            <p className="text-2xl font-bold">{plans.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Active Plans</p>
            <p className="text-2xl font-bold">
              {plans.filter((p) => p.status === "ACTIVE").length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Budget</p>
            <p className="text-2xl font-bold">
              ${plans.reduce((sum, p) => sum + p.totalBudget, 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Spent</p>
            <p className="text-2xl font-bold">
              $
              {plans
                .reduce((sum, p) => sum + (p.totalBudget - p.remainingBudget), 0)
                .toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Managed Plans */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Managed Plans</h2>
        {plans.length === 0 ? (
          <p className="text-gray-500">No plans assigned</p>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="border rounded p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{plan.planNumber}</p>
                    <p className="text-sm text-gray-600">{plan.participant.name}</p>
                    <p className="text-xs text-gray-500">{plan.participant.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${plan.remainingBudget.toFixed(2)} / ${plan.totalBudget.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">{plan.status}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan Details Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Plan Details</h2>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Participant</p>
                <p className="font-semibold">{selectedPlan.participant.name}</p>
                <p className="text-sm text-gray-600">{selectedPlan.participant.email}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Budget Categories</p>
                <div className="mt-2 space-y-2">
                  {selectedPlan.categories.map((category) => (
                    <div key={category.id} className="border rounded p-3">
                      <div className="flex justify-between">
                        <span className="font-medium">{category.categoryCode}</span>
                        <span>
                          ${category.spentAmount.toFixed(2)} / $
                          {category.allocatedAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${
                              (category.spentAmount / category.allocatedAmount) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
