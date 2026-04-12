import { User } from "lucide-react";
import Link from "next/link";

import type { Provider } from "./types";

type ProviderWorkersProps = {
  provider: Provider;
};

export default function ProviderWorkers({ provider }: ProviderWorkersProps) {
  const workers = provider.workers ?? [];

  if (workers.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg">Workers</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {workers.map((wp) => {
          const worker = wp.worker;
          const user = worker.user;
          return (
            <li key={worker.id}>
              <Link
                href={`/worker/${worker.id}`}
                className="flex gap-3 rounded-lg border border-border/60 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <User className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-foreground">{user?.name ?? "Worker"}</p>
                  {worker.qualifications && (
                    <p className="text-sm text-muted-foreground">
                      {worker.qualifications}
                    </p>
                  )}
                  {worker.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {worker.bio}
                    </p>
                  )}
                  {worker.languages?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {worker.languages.map((lang) => (
                        <span
                          key={lang.id}
                          className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {lang.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {worker.specialisations?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {worker.specialisations.map((spec) => (
                        <span
                          key={spec.id}
                          className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
                        >
                          {spec.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
