import { Mail } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { WorkerWithRelations } from "./types";

type WorkerSidebarProps = {
  worker: WorkerWithRelations;
};

export default function WorkerSidebar({ worker }: WorkerSidebarProps) {
  const email = worker.user.email;

  return (
    <div className="space-y-6">
      <Card variant="outlined">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {email ? (
            <Button asChild variant="outline" size="default" className="w-full">
              <a href={`mailto:${email}`}>
                <Mail className="mr-2 h-4 w-4" />
                Email
              </a>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">No contact available</p>
          )}
        </CardContent>
      </Card>

      {worker.providers.length > 0 && (
        <Card variant="outlined">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Works with</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {worker.providers.map((wp) => (
              <Link
                key={wp.id}
                href={`/provider/${wp.provider.id}`}
                className="block text-sm text-primary hover:underline"
              >
                {wp.provider.name}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Link
        href="/provider-finder"
        className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to Provider Finder
      </Link>
    </div>
  );
}
