import { Sparkles } from "lucide-react";

import type { WorkerWithRelations } from "./types";

type WorkerSpecialisationsProps = {
  worker: WorkerWithRelations;
};

export default function WorkerSpecialisations({
  worker,
}: WorkerSpecialisationsProps) {
  if (worker.specialisations.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg">
        <Sparkles className="h-5 w-5 shrink-0" />
        Specialisations
      </h2>
      <ul className="flex flex-wrap gap-2">
        {worker.specialisations.map((spec) => (
          <li
            key={spec.id}
            className="rounded-md bg-primary/10 px-3 py-1.5 text-sm text-primary"
          >
            {spec.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
