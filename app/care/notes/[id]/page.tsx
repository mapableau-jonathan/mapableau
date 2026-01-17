"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FileText, Calendar, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CareNote {
  id: string;
  noteType: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
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

export default function CaseNoteDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [note, setNote] = useState<CareNote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchNote();
    }
  }, [params.id]);

  const fetchNote = async () => {
    try {
      const response = await fetch(`/api/care/notes/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setNote(data);
      }
    } catch (error) {
      console.error("Error fetching case note:", error);
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

  if (!note) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Case note not found</p>
      </div>
    );
  }

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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2 flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Case Note
              </CardTitle>
              <div className="flex items-center gap-2">
                {getTypeBadge(note.noteType)}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Note Details */}
            <div>
              <h3 className="font-semibold mb-3">Note Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span>{new Date(note.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Worker:</span>
                  <span>
                    {note.worker.user.name || note.worker.user.email}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Participant:</span>
                  <span>
                    {note.carePlan.participant.name || note.carePlan.participant.email}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Care Plan:</span>
                  <span>{note.carePlan.planName}</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div>
              <h3 className="font-semibold mb-2">Content</h3>
              <div className="bg-muted p-4 rounded-lg">
                <p className="whitespace-pre-wrap text-sm">{note.content}</p>
              </div>
            </div>

            {/* Metadata */}
            {note.metadata && Object.keys(note.metadata).length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Additional Information</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(note.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
