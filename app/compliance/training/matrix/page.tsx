"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { GraduationCap, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrainingMatrix {
  [workerId: string]: {
    [trainingType: string]: {
      record: any;
      expired: boolean;
    };
  };
}

export default function TrainingMatrixPage() {
  const { data: session } = useSession();
  const [matrix, setMatrix] = useState<TrainingMatrix>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatrix();
  }, []);

  const fetchMatrix = async () => {
    try {
      const response = await fetch("/api/compliance/training/matrix");
      if (response.ok) {
        const data = await response.json();
        setMatrix(data.matrix || {});
      }
    } catch (error) {
      console.error("Error fetching training matrix:", error);
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

  const workers = Object.keys(matrix);
  const trainingTypes = new Set<string>();
  workers.forEach((workerId) => {
    Object.keys(matrix[workerId]).forEach((type) => trainingTypes.add(type));
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Training Matrix</h1>
        <p className="text-muted-foreground">
          Overview of training completion by worker and type
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 text-left">Worker</th>
                  {Array.from(trainingTypes).map((type) => (
                    <th key={type} className="border p-2 text-center">
                      {type}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workers.map((workerId) => {
                  const workerData = matrix[workerId];
                  const workerName =
                    workerData[Object.keys(workerData)[0]]?.record?.worker?.user
                      ?.name ||
                    workerData[Object.keys(workerData)[0]]?.record?.worker?.user
                      ?.email ||
                    "Unknown";

                  return (
                    <tr key={workerId}>
                      <td className="border p-2 font-medium">{workerName}</td>
                      {Array.from(trainingTypes).map((type) => {
                        const training = workerData[type];
                        return (
                          <td key={type} className="border p-2 text-center">
                            {training ? (
                              <div className="flex items-center justify-center">
                                {training.expired ? (
                                  <XCircle className="h-5 w-5 text-red-600" />
                                ) : (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                )}
                                {training.expired && (
                                  <AlertCircle className="h-4 w-4 text-red-600 ml-1" />
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
