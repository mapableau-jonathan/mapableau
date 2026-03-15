"use client";

import dynamic from "next/dynamic";

import type { ProviderWithRelations } from "./types";

const ProviderLocationMap = dynamic(
  () => import("./ProviderLocationMap"),
  { ssr: false },
);

type Props = {
  provider: ProviderWithRelations;
};

export default function ProviderLocationMapClient({ provider }: Props) {
  return <ProviderLocationMap provider={provider} />;
}
