import { Clock } from "lucide-react";

import { getDbTimeString } from "@/lib/dbTime";

import type { WorkerWithRelations } from "./types";

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

type WorkerAvailabilityProps = {
  worker: WorkerWithRelations;
};

export default function WorkerAvailability({
  worker,
}: WorkerAvailabilityProps) {
  if (worker.availability.length === 0) return null;

  const order = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ] as const;
  const sorted = [...worker.availability].sort(
    (a, b) => order.indexOf(a.dayOfWeek) - order.indexOf(b.dayOfWeek),
  );

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg">
        <Clock className="h-5 w-5 shrink-0" />
        Availability
      </h2>
      <div className="grid max-w-md grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm tabular-nums">
        {sorted.map((a) => (
          <span key={a.id} className="contents">
            <span className="text-muted-foreground">
              {DAY_LABELS[a.dayOfWeek] ?? a.dayOfWeek}
            </span>
            <span>
              {/* todo: test */}
              {getDbTimeString(a.startTime)} – {getDbTimeString(a.endTime)}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
