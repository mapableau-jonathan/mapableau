import { Briefcase, User } from "lucide-react";

import type { WorkerWithRelations } from "./types";

type WorkerHeroProps = {
  worker: WorkerWithRelations;
};

export default function WorkerHero({ worker }: WorkerHeroProps) {
  const displayName = worker.user.name;
  const initial = displayName.trim().charAt(0) || "?";

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/30 sm:h-24 sm:w-24">
        <span className="text-2xl text-muted-foreground sm:text-3xl">
          {initial}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <h1 className="text-2xl tracking-tight sm:text-3xl">{displayName}</h1>

        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <User className="h-4 w-4 shrink-0" />
          Support worker
        </p>

        {worker.qualifications && (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <Briefcase className="mt-0.5 h-4 w-4 shrink-0" />
            {worker.qualifications}
          </p>
        )}
      </div>
    </div>
  );
}
