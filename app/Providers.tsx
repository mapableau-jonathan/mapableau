"use client";

import { SessionProvider } from "next-auth/react";

import { BrandProvider } from "@/app/contexts/BrandContext";
import { ParticipantConsumerProvider } from "@/app/contexts/ParticipantConsumerContext";
import { QueryProvider } from "@/lib/query-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <BrandProvider>
          <ParticipantConsumerProvider>{children}</ParticipantConsumerProvider>
        </BrandProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
