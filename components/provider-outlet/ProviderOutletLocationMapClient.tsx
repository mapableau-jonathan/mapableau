"use client";

import dynamic from "next/dynamic";

import type { ProviderOutlet } from "./types";

const ProviderOutletLocationMap = dynamic(
  () => import("./ProviderOutletLocationMap"),
  {
    ssr: false,
  },
);

type Props = {
  providerOutlet: ProviderOutlet;
};

export default function ProviderOutletLocationMapClient({
  providerOutlet,
}: Props) {
  return <ProviderOutletLocationMap providerOutlet={providerOutlet} />;
}
