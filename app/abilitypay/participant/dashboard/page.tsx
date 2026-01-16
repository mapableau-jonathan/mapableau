/**
 * Participant Dashboard
 * View plan overview, budget breakdown, spending history, and service booking
 */

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Plan {
  id: string;
  planNumber: string;
  status: string;
  totalBudget: number;
  remainingBudget: number;
  startDate: string;
  endDate: string;
  categories: Array<{
    id: string;
    categoryCode: string;
    allocatedAmount: number;
    spentAmount: number;
    remainingAmount: number;
  }>;
}

interface Transaction {
  id: string;
  serviceCode: string;
  serviceDescription: string;
  amount: number;
  status: string;
  createdAt: string;
  provider: {
    name: string;
    email: string;
  };
}

export default function ParticipantDashboard() {
  const { data: session } = useSession();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetchPlan();
      fetchTransactions();
    }
  }, [session]);

  const fetchPlan = async () => {
    try {
      const response = await fetch(
        `/api/abilitypay/plans?participantId=${session?.user?.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setPlan(data);
      }
    } catch (error) {
      console.error("Failed to fetch plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(
        `/api/abilitypay/payments?participantId=${session?.user?.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Active Plan</h1>
          <p>You don't have an active NDIS plan. Please contact your plan manager.</p>
        </div>
      </div>
    );
  }

  const budgetUtilization =
    ((plan.totalBudget - plan.remainingBudget) / plan.totalBudget) * 100;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">My NDIS Plan</h1>

      {/* Plan Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Plan Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Plan Number</p>
            <p className="text-lg font-semibold">{plan.planNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-lg font-semibold">{plan.status}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Period</p>
            <p className="text-lg font-semibold">
              {new Date(plan.startDate).toLocaleDateString()} -{" "}
              {new Date(plan.endDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Budget Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Budget Summary</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span>Total Budget</span>
              <span className="font-semibold">${plan.totalBudget.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Remaining</span>
              <span className="font-semibold">
                ${plan.remainingBudget.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${budgetUtilization}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {budgetUtilization.toFixed(1)}% utilized
            </p>
          </div>
        </div>
      </div>

      {/* Budget Categories */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Budget Categories</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Allocated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {plan.categories.map((category) => (
                <tr key={category.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {category.categoryCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${category.allocatedAmount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${category.spentAmount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${category.remainingAmount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <p className="text-gray-500">No transactions yet</p>
          ) : (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="border-b border-gray-200 pb-4 last:border-0"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{transaction.serviceDescription}</p>
                    <p className="text-sm text-gray-600">
                      {transaction.serviceCode} • {transaction.provider.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${transaction.amount.toFixed(2)}</p>
                    <p
                      className={`text-xs ${
                        transaction.status === "COMPLETED"
                          ? "text-green-600"
                          : transaction.status === "FAILED"
                          ? "text-red-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {transaction.status}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
