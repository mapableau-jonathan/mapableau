"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  reason: string | null;
  actorId: string | null;
  createdAt: string;
  metadata: unknown;
}

export default function AdminSponsorshipDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [enforceLoading, setEnforceLoading] = useState(false);
  const [action, setAction] = useState<string>("suspend");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/sponsorships/${id}/audit`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error("Failed")))
      .then((data) => {
        setAuditLog(data.auditLog ?? []);
      })
      .catch(() => setAuditLog([]))
      .finally(() => setLoading(false));
  }, [id]);

  const handleEnforce = async () => {
    if (!reason.trim()) {
      alert("Please enter a reason.");
      return;
    }
    setEnforceLoading(true);
    try {
      const body: { action: string; reason: string; deboostUntil?: string } = {
        action,
        reason: reason.trim(),
      };
      if (action === "deboost") {
        const until = new Date();
        until.setDate(until.getDate() + 7);
        body.deboostUntil = until.toISOString();
      }
      const res = await fetch(`/api/admin/sponsorships/${id}/enforce`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setReason("");
        const data = await res.json();
        alert(`Updated: ${data.status}`);
        window.location.href = "/admin/sponsorships";
      } else {
        const err = await res.json();
        alert(err.error ?? "Failed");
      }
    } finally {
      setEnforceLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link
        href="/admin/sponsorships"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sponsorships
      </Link>

      <h1 className="text-2xl font-heading font-bold mb-4">
        Sponsorship enforcement
      </h1>
      <p className="text-muted-foreground mb-6">
        Apply enforcement actions and view audit trail for sponsorship {id}.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Enforcement action</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label htmlFor="enforcement-action" className="block text-sm font-medium">Action</label>
          <select
            id="enforcement-action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
            aria-label="Enforcement action"
          >
            <option value="warn">Warning</option>
            <option value="deboost">Temporary de-boost (7 days)</option>
            <option value="suspend">Suspend sponsorship</option>
            <option value="reinstate">Reinstate</option>
          </select>
          <label className="block text-sm font-medium">Reason (required)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for this action"
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
            rows={3}
          />
          <Button
            onClick={handleEnforce}
            disabled={enforceLoading || !reason.trim()}
          >
            {enforceLoading ? "Applying..." : "Apply"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit trail</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : auditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            <ul className="space-y-2">
              {auditLog.map((e) => (
                <li
                  key={e.id}
                  className="text-sm border-b border-border pb-2 last:border-0"
                >
                  <span className="font-medium">{e.action}</span>
                  {e.reason && ` · ${e.reason}`}
                  <span className="text-muted-foreground block text-xs mt-0.5">
                    {new Date(e.createdAt).toLocaleString()}
                    {e.actorId && ` · by ${e.actorId}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
