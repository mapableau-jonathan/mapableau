import { Mail } from "lucide-react";

import type { WorkerWithRelations } from "./types";

type WorkerOverviewProps = {
  worker: WorkerWithRelations;
};

export default function WorkerOverview({ worker }: WorkerOverviewProps) {
  const hasContent =
    worker.bio || worker.user.email;

  if (!hasContent) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg">Overview</h2>

      {worker.bio && (
        <p className="text-muted-foreground leading-relaxed">{worker.bio}</p>
      )}

      {worker.user.email && (
        <div className="space-y-3">
          <h3 className="text-sm text-foreground">Contact</h3>
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" />
            <a
              href={`mailto:${worker.user.email}`}
              className="break-all text-primary hover:underline"
            >
              {worker.user.email}
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
