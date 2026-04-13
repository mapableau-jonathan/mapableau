import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function LoginFallback() {
  return (
    <Card variant="gradient" className="animate-pulse">
      <CardHeader className="pb-4">
        <div className="h-3 w-14 rounded bg-muted" />
        <div className="mt-2 h-8 w-40 max-w-full rounded bg-muted sm:h-9" />
        <div className="mt-2 h-4 w-full max-w-sm rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="space-y-2">
          <div className="h-3 w-12 rounded bg-muted" />
          <div className="h-10 w-full rounded-lg bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-10 w-full rounded-lg bg-muted" />
        </div>
        <div className="h-11 w-full rounded-lg bg-muted" />
      </CardContent>
    </Card>
  );
}
