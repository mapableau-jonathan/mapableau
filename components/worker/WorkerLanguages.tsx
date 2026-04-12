import { Languages } from "lucide-react";

import type { WorkerWithRelations } from "./types";

type WorkerLanguagesProps = {
  worker: WorkerWithRelations;
};

export default function WorkerLanguages({ worker }: WorkerLanguagesProps) {
  if (worker.languages.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg">
        <Languages className="h-5 w-5 shrink-0" />
        Languages
      </h2>
      <ul className="flex flex-wrap gap-2">
        {worker.languages.map((lang) => (
          <li
            key={lang.id}
            className="rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground"
          >
            {lang.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
