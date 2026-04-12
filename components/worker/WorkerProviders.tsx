import { Building2 } from "lucide-react";
import Link from "next/link";

import type { WorkerWithRelations } from "./types";

type WorkerProvidersProps = {
  worker: WorkerWithRelations;
};

export default function WorkerProviders({ worker }: WorkerProvidersProps) {
  if (worker.providers.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg">
        <Building2 className="h-5 w-5 shrink-0" />
        Providers
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {worker.providers.map((wp) => (
          <li key={wp.id}>
            <Link
              href={`/provider/${wp.provider.id}`}
              className="flex items-center gap-2 rounded-lg border border-border/60 px-4 py-3 text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              {wp.provider.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
