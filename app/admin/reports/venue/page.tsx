"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

interface VenueReportItem {
  id: string;
  businessId: string;
  userId: string;
  type: string;
  description: string;
  status: string;
  createdAt: string;
  business?: { id: string; name: string };
}

export default function AdminVenueReportsPage() {
  const [reports, setReports] = useState<VenueReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/reports/venue")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed"))))
      .then((data) => setReports(data.reports ?? []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to admin
      </Link>

      <h1 className="text-2xl font-heading font-bold mb-4">
        Venue reports
      </h1>
      <p className="text-muted-foreground mb-6">
        Reports of inaccurate accessibility info or misleading sponsorship. Use support tickets with category ACCESSIBILITY_REPORT or SPONSORSHIP_REPORT, or query VenueReport table via API.
      </p>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No venue reports yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {r.business?.name ?? r.businessId}
                </CardTitle>
                <Badge variant="secondary">{r.type}</Badge>
                <Badge variant={r.status === "OPEN" ? "default" : "outline"}>
                  {r.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{r.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(r.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
