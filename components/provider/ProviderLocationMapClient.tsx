"use client";

import dynamic from "next/dynamic";

import type { Provider } from "./types";

const ProviderLocationMap = dynamic(() => import("./ProviderLocationMap"), {
  ssr: false,
});

type Props = {
  provider: Provider;
};

export default function ProviderLocationMapClient({ provider }: Props) {
  return <ProviderLocationMap provider={provider} />;
}
