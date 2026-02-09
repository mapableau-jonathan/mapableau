"use client";

import { Card } from "@/components/ui/card";

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = "Loading providers…" }: LoadingStateProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12">
      <Card variant="outlined" className="p-8 text-center max-w-md">
        <p className="text-muted-foreground">{message}</p>
      </Card>
    </div>
  );
}

type ErrorStateProps = {
  title?: string;
  message: string;
};

export function ErrorState({
  title = "Could not load providers",
  message,
}: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12">
      <Card variant="outlined" className="p-8 text-center max-w-md">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </Card>
    </div>
  );
}
