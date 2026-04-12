import type { DayOfWeek } from "@prisma/client";

export type WorkerWithRelations = {
  id: string;
  bio: string | null;
  qualifications: string | null;
  user: {
    name: string;
    email: string;
  };
  languages: { id: string; name: string }[];
  specialisations: { id: string; name: string }[];
  availability: {
    id: string;
    dayOfWeek: DayOfWeek;
    startTime: Date;
    endTime: Date;
  }[];
  providers: {
    id: string;
    provider: { id: string; name: string };
  }[];
};
