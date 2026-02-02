"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface SponsorshipItem {
  id: string;
  businessId: string;
  sponsorOrgId: string;
  tier: string;
  status: string;
  startAt: string;
  endAt: string | null;
  createdAt: string;
  business: { id: string; name: string; category: string; verified: boolean };
  sponsorOrg: { id: string; name: string | null; email: string };
}

export default function AdminSponsorshipsPage() {
  const [sponsorships, setSponsorships] = useState<SponsorshipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSponsorships = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/sponsorships?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSponsorships(data.sponsorships ?? []);
      }
    } catch (err) {
      console.error("Error fetching sponsorships:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSponsorships();
  }, [statusFilter]);

  const updateStatus = async (id: string, status: string, reason?: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/sponsorships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      if (res.ok) await fetchSponsorships();
      else {
        const err = await res.json();
        alert(err.error ?? "Failed to update");
      }
    } finally {
      setActionLoading(null);
    }
  };

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
        Sponsorship applications
      </h1>
      <p className="text-muted-foreground mb-6">
        Review and approve or reject sponsorship applications. Sponsored markers require verification tier.
      </p>

      <div className="flex gap-2 mb-6">
        {["PENDING", "ACTIVE", "SUSPENDED", "ENDED", "all"].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s === "all" ? "All" : s}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="space-y-4">
          {sponsorships.length === 0 ? (
            <p className="text-muted-foreground">No sponsorships found.</p>
          ) : (
            sponsorships.map((s) => (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {s.business.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground capitalize">
                        {s.business.category.replace(/_/g, " ")} · {s.tier.replace(/_/g, " ")}
                      </p>
                    </div>
                    <Badge variant={s.status === "ACTIVE" ? "default" : s.status === "PENDING" ? "secondary" : "destructive"}>
                      {s.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">
                    Sponsor: {s.sponsorOrg.name ?? s.sponsorOrg.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Applied: {new Date(s.createdAt).toLocaleDateString()} · Start: {new Date(s.startAt).toLocaleDateString()}
                  </p>
                  {s.status === "PENDING" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => updateStatus(s.id, "ACTIVE")}
                        disabled={!!actionLoading}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(s.id, "ENDED", "Rejected")}
                        disabled={!!actionLoading}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Link href={`/admin/sponsorships/${s.id}`}>
                        <Button size="sm" variant="secondary">
                          Enforce / Audit
                        </Button>
                      </Link>
                    </div>
                  )}
                  {s.status === "ACTIVE" && (
                    <Link href={`/admin/sponsorships/${s.id}`}>
                      <Button size="sm" variant="secondary">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Enforce / Audit
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
