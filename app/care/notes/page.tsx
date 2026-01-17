"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Plus, FileText, Filter, Calendar, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface CareNote {
  id: string;
  noteType: string;
  content: string;
  createdAt: string;
  carePlan: {
    id: string;
    planName: string;
    participant: {
      id: string;
      name: string;
      email: string;
    };
  };
  worker: {
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export default function CaseNotesPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const carePlanId = searchParams.get("carePlanId");
  const [notes, setNotes] = useState<CareNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    noteType: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchNotes();
  }, [filters, carePlanId]);

  const fetchNotes = async () => {
    try {
      const params = new URLSearchParams();
      if (carePlanId) params.append("carePlanId", carePlanId);
      if (filters.noteType) params.append("noteType", filters.noteType);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const response = await fetch(`/api/care/notes?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.careNotes || []);
      }
    } catch (error) {
      console.error("Error fetching case notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (carePlanId) params.append("carePlanId", carePlanId);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const response = await fetch(`/api/care/notes/export?${params.toString()}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `case-notes-${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error exporting notes:", error);
      alert("Failed to export notes");
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      PROGRESS: "bg-blue-100 text-blue-800",
      MEDICATION: "bg-red-100 text-red-800",
      PERSONAL_CARE: "bg-green-100 text-green-800",
      INCIDENT: "bg-orange-100 text-orange-800",
      ACTIVITY: "bg-purple-100 text-purple-800",
      OTHER: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge className={colors[type] || "bg-gray-100 text-gray-800"}>
        {type.replace(/_/g, " ")}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Case Notes</h1>
          <p className="text-muted-foreground">
            Daily progress notes and care documentation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button asChild>
            <Link href={`/care/notes/create${carePlanId ? `?carePlanId=${carePlanId}` : ""}`}>
              <Plus className="h-4 w-4 mr-2" />
              New Note
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <select
              value={filters.noteType}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, noteType: e.target.value }))
              }
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Types</option>
              <option value="PROGRESS">Progress</option>
              <option value="MEDICATION">Medication</option>
              <option value="PERSONAL_CARE">Personal Care</option>
              <option value="INCIDENT">Incident</option>
              <option value="ACTIVITY">Activity</option>
              <option value="OTHER">Other</option>
            </select>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="px-4 py-2 border rounded-lg"
                placeholder="Start Date"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="px-4 py-2 border rounded-lg"
                placeholder="End Date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading case notes...</p>
        </div>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No case notes found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <Card key={note.id} variant="interactive">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">
                        {note.carePlan.planName}
                      </CardTitle>
                      {getTypeBadge(note.noteType)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                      <span>
                        Worker: {note.worker.user.name || note.worker.user.email}
                      </span>
                      <span>
                        Participant: {note.carePlan.participant.name || note.carePlan.participant.email}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/care/notes/${note.id}`}>View</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap line-clamp-3">
                  {note.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
