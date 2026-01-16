/**
 * Provider Portal
 * View payment receipts, pending redemptions, and redemption interface
 */

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface Receipt {
  id: string;
  serviceCode: string;
  serviceDescription: string;
  amount: number;
  status: string;
  completedAt: string;
  participant: {
    name: string;
    email: string;
  };
}

interface Redemption {
  id: string;
  totalAmount: number;
  status: string;
  requestedAt: string;
  settledAt?: string;
  transactionIds: string[];
}

export default function ProviderPortal() {
  const { data: session } = useSession();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRedemptionForm, setShowRedemptionForm] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchReceipts();
      fetchRedemptions();
    }
  }, [session]);

  const fetchReceipts = async () => {
    try {
      const response = await fetch(
        `/api/abilitypay/payments?providerId=${session?.user?.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setReceipts(data);
      }
    } catch (error) {
      console.error("Failed to fetch receipts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRedemptions = async () => {
    try {
      const response = await fetch(
        `/api/abilitypay/redemptions?providerId=${session?.user?.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setRedemptions(data);
      }
    } catch (error) {
      console.error("Failed to fetch redemptions:", error);
    }
  };

  const handleRequestRedemption = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch("/api/abilitypay/redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: session?.user?.id,
          transactionIds: selectedTransactions,
          bankAccountDetails: {
            accountNumber: formData.get("accountNumber"),
            bsb: formData.get("bsb"),
            accountName: formData.get("accountName"),
            payId: formData.get("payId") || undefined,
          },
        }),
      });

      if (response.ok) {
        setShowRedemptionForm(false);
        setSelectedTransactions([]);
        fetchRedemptions();
        alert("Redemption request submitted successfully");
      } else {
        const error = await response.json();
        alert(`Failed to submit redemption: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to request redemption:", error);
      alert("Failed to submit redemption request");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  const pendingReceipts = receipts.filter((r) => r.status === "COMPLETED");
  const totalPending = pendingReceipts.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Provider Portal</h1>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Payment Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Receipts</p>
            <p className="text-2xl font-bold">{receipts.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Pending Redemption</p>
            <p className="text-2xl font-bold">${totalPending.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Completed Redemptions</p>
            <p className="text-2xl font-bold">
              {redemptions.filter((r) => r.status === "COMPLETED").length}
            </p>
          </div>
        </div>
      </div>

      {/* Redemption Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Redemptions</h2>
          <button
            onClick={() => setShowRedemptionForm(!showRedemptionForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {showRedemptionForm ? "Cancel" : "Request Redemption"}
          </button>
        </div>

        {showRedemptionForm && (
          <form onSubmit={handleRequestRedemption} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Transactions
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border p-2 rounded">
                {pendingReceipts.map((receipt) => (
                  <label key={receipt.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.includes(receipt.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTransactions([...selectedTransactions, receipt.id]);
                        } else {
                          setSelectedTransactions(
                            selectedTransactions.filter((id) => id !== receipt.id)
                          );
                        }
                      }}
                    />
                    <span className="text-sm">
                      {receipt.serviceDescription} - ${receipt.amount.toFixed(2)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  required
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  BSB
                </label>
                <input
                  type="text"
                  name="bsb"
                  required
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Name
                </label>
                <input
                  type="text"
                  name="accountName"
                  required
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PayID (Optional)
                </label>
                <input
                  type="text"
                  name="payId"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={selectedTransactions.length === 0}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              Submit Redemption Request
            </button>
          </form>
        )}

        {/* Redemption History */}
        <div className="space-y-4">
          {redemptions.length === 0 ? (
            <p className="text-gray-500">No redemption requests</p>
          ) : (
            redemptions.map((redemption) => (
              <div
                key={redemption.id}
                className="border-b border-gray-200 pb-4 last:border-0"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">
                      ${redemption.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {redemption.transactionIds.length} transactions
                    </p>
                    <p className="text-xs text-gray-500">
                      Requested: {new Date(redemption.requestedAt).toLocaleString()}
                    </p>
                    {redemption.settledAt && (
                      <p className="text-xs text-gray-500">
                        Settled: {new Date(redemption.settledAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <span
                      className={`px-3 py-1 rounded text-sm ${
                        redemption.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : redemption.status === "FAILED"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {redemption.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Receipts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Payment Receipts</h2>
        <div className="space-y-4">
          {receipts.length === 0 ? (
            <p className="text-gray-500">No receipts yet</p>
          ) : (
            receipts.map((receipt) => (
              <div
                key={receipt.id}
                className="border-b border-gray-200 pb-4 last:border-0"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{receipt.serviceDescription}</p>
                    <p className="text-sm text-gray-600">
                      {receipt.serviceCode} • {receipt.participant.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(receipt.completedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${receipt.amount.toFixed(2)}</p>
                    <p className="text-xs text-green-600">{receipt.status}</p>
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
